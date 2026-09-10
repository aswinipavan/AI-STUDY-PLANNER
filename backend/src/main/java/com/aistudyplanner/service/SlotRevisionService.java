package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.dto.request.CompleteRevisionRequest;
import com.aistudyplanner.model.dto.response.FormulaItem;
import com.aistudyplanner.model.dto.response.QuizQuestion;
import com.aistudyplanner.model.dto.response.SlotRevisionResponse;
import com.aistudyplanner.model.entity.Material;
import com.aistudyplanner.model.entity.SlotRevision;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.TimetableSlot;
import com.aistudyplanner.repository.MaterialRepository;
import com.aistudyplanner.repository.SlotRevisionRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.TimetableSlotRepository;
import com.aistudyplanner.service.ai.AiCompletion;
import com.aistudyplanner.service.ai.AiProviderGateway;
import com.aistudyplanner.service.ai.AiRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SlotRevisionService {

    private final SlotRevisionRepository slotRevisionRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final StudentRepository studentRepository;
    private final MaterialRepository materialRepository;
    private final MaterialTopicReader materialTopicReader;
    private final AiProviderGateway aiProviderGateway;
    private final ObjectMapper objectMapper;

    /**
     * Retrieve existing revision experience or generate a fresh one for a completed & verified session.
     */
    @Transactional
    public SlotRevisionResponse getOrGenerateRevision(UUID studentId, UUID slotId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        TimetableSlot slot = timetableSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable slot not found"));

        if (!slot.getTimetable().getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Slot does not belong to the authenticated student");
        }

        if (!Boolean.TRUE.equals(slot.getIsCompleted())) {
            throw new IllegalStateException("Revision mode is only available for completed and verified sessions");
        }

        // Check if revision is already stored
        Optional<SlotRevision> existing = slotRevisionRepository.findByTimetableSlotIdAndStudentId(slotId, studentId);
        if (existing.isPresent()) {
            return mapToResponse(existing.get(), slot);
        }

        // Generate revision
        SlotRevision newRevision = generateRevisionExperience(student, slot);
        SlotRevision saved = slotRevisionRepository.save(newRevision);
        return mapToResponse(saved, slot);
    }

    /**
     * Mark a revision session as completed and record the quiz score.
     * Preserves existing timetable slot completion rules completely.
     */
    @Transactional
    public SlotRevisionResponse completeRevision(UUID studentId, UUID slotId, CompleteRevisionRequest request) {
        SlotRevision revision = slotRevisionRepository.findByTimetableSlotIdAndStudentId(slotId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Revision session not found for this slot"));

        revision.setIsCompleted(true);
        revision.setScore(request.getScore() != null ? request.getScore() : 100);
        revision.setCompletedAt(OffsetDateTime.now());

        SlotRevision updated = slotRevisionRepository.save(revision);
        TimetableSlot slot = revision.getTimetableSlot();
        return mapToResponse(updated, slot);
    }

    private SlotRevision generateRevisionExperience(Student student, TimetableSlot slot) {
        UUID subjectId = slot.getSubject() != null ? slot.getSubject().getId() : null;
        String subjectName = slot.getSubject() != null ? slot.getSubject().getSubjectName() : "General Studies";
        String topicLabel = slot.getTopic() != null ? slot.getTopic() : subjectName;

        MaterialTopicReader.TopicDetail detail = materialTopicReader.resolveTopicDetail(
                student.getId(), subjectId, topicLabel, subjectName);

        // Check if uploaded materials exist
        List<Material> materials = subjectId != null
                ? materialRepository.findAllByStudentIdAndSubjectId(student.getId(), subjectId)
                : Collections.emptyList();

        String materialContext = buildMaterialContext(detail, materials);

        // Attempt AI generation
        try {
            String prompt = buildRevisionPrompt(subjectName, detail.getTopic(), detail.getChapter(), materialContext);
            AiRequest aiRequest = new AiRequest(
                    prompt,
                    0.2,
                    1500,
                    "slot_revision_generation"
            );

            AiCompletion completion = aiProviderGateway.complete(aiRequest);
            String content = completion.text();
            SlotRevision parsed = parseAiRevisionJson(content, student, slot, detail.getTopic());
            if (parsed != null) {
                return parsed;
            }
        } catch (Exception e) {
            log.warn("AI generation failed or unavailable for slot {}: {}. Falling back to deterministic curriculum generator.",
                    slot.getId(), e.getMessage());
        }

        // Fallback generator
        return buildFallbackRevision(student, slot, detail, subjectName);
    }

    private String buildMaterialContext(MaterialTopicReader.TopicDetail detail, List<Material> materials) {
        StringBuilder sb = new StringBuilder();
        if (detail.getMaterialTitle() != null) {
            sb.append("Source Material: ").append(detail.getMaterialTitle()).append("\n");
        }
        if (detail.getWhatToStudy() != null && !detail.getWhatToStudy().isEmpty()) {
            sb.append("What to study points:\n");
            for (String p : detail.getWhatToStudy()) {
                sb.append("- ").append(p).append("\n");
            }
        }
        if (materials != null && !materials.isEmpty()) {
            Material first = materials.get(0);
            if (first.getAiSummary() != null && !first.getAiSummary().isBlank()) {
                sb.append("Curriculum Context: ").append(first.getAiSummary()).append("\n");
            }
            if (first.getExtractedKeywords() != null && !first.getExtractedKeywords().isBlank()) {
                sb.append("Key Terminology: ").append(first.getExtractedKeywords()).append("\n");
            }
        }
        return sb.toString();
    }

    private String buildRevisionPrompt(String subject, String topic, String chapter, String context) {
        return String.format("""
                Generate a structured, high-yield 5-15 minute revision guide for the following session:
                Subject: %s
                Chapter: %s
                Topic: %s

                Available Material Context:
                %s

                Return ONLY a valid JSON object matching this exact schema:
                {
                  "summary": "3-4 concise sentences summarizing the core principles, derivations, or concepts of this topic.",
                  "keyConcepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4"],
                  "importantFormulas": [
                    { "name": "Formula or Rule Name", "formula": "LaTeX math syntax e.g. E = mc^2 or O(n \\log n)", "explanation": "When and why to use it" },
                    { "name": "Second Formula or Identity", "formula": "Formula syntax", "explanation": "Application rule" }
                  ],
                  "quizQuestions": [
                    {
                      "id": 1,
                      "question": "Conceptual multiple-choice question on this topic?",
                      "options": ["Option A", "Option B", "Option C", "Option D"],
                      "correctOptionIndex": 0,
                      "explanation": "Why this option is correct."
                    },
                    {
                      "id": 2,
                      "question": "Question 2?",
                      "options": ["A", "B", "C", "D"],
                      "correctOptionIndex": 1,
                      "explanation": "Explanation 2."
                    },
                    {
                      "id": 3,
                      "question": "Question 3?",
                      "options": ["A", "B", "C", "D"],
                      "correctOptionIndex": 2,
                      "explanation": "Explanation 3."
                    },
                    {
                      "id": 4,
                      "question": "Question 4?",
                      "options": ["A", "B", "C", "D"],
                      "correctOptionIndex": 3,
                      "explanation": "Explanation 4."
                    },
                    {
                      "id": 5,
                      "question": "Question 5?",
                      "options": ["A", "B", "C", "D"],
                      "correctOptionIndex": 0,
                      "explanation": "Explanation 5."
                    }
                  ],
                  "weakAreas": [
                    "Common pitfall 1 to avoid in exams",
                    "Misconception 2 students frequently make",
                    "Boundary case or edge condition to verify"
                  ],
                  "quickRevisionPoints": [
                    "Rapid recall bullet point 1",
                    "Rapid recall bullet point 2",
                    "Rapid recall bullet point 3",
                    "Rapid recall bullet point 4"
                  ]
                }
                """, subject, chapter, topic, context);
    }

    private SlotRevision parseAiRevisionJson(String content, Student student, TimetableSlot slot, String topic) {
        if (content == null || content.isBlank()) return null;
        try {
            String jsonStr = content.trim();
            if (jsonStr.startsWith("```json")) {
                jsonStr = jsonStr.substring(7);
            } else if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.substring(3);
            }
            if (jsonStr.endsWith("```")) {
                jsonStr = jsonStr.substring(0, jsonStr.length() - 3);
            }
            jsonStr = jsonStr.trim();

            JsonNode root = objectMapper.readTree(jsonStr);
            String summary = root.has("summary") ? root.get("summary").asText() : "";
            String keyConcepts = root.has("keyConcepts") ? root.get("keyConcepts").toString() : "[]";
            String importantFormulas = root.has("importantFormulas") ? root.get("importantFormulas").toString() : "[]";
            String quizQuestions = root.has("quizQuestions") ? root.get("quizQuestions").toString() : "[]";
            String weakAreas = root.has("weakAreas") ? root.get("weakAreas").toString() : "[]";
            String quickRevisionPoints = root.has("quickRevisionPoints") ? root.get("quickRevisionPoints").toString() : "[]";

            if (summary.isBlank() || quizQuestions.equals("[]")) {
                return null;
            }

            return SlotRevision.builder()
                    .student(student)
                    .timetableSlot(slot)
                    .topic(topic)
                    .summary(summary)
                    .keyConcepts(keyConcepts)
                    .importantFormulas(importantFormulas)
                    .quizQuestions(quizQuestions)
                    .weakAreas(weakAreas)
                    .quickRevisionPoints(quickRevisionPoints)
                    .score(0)
                    .isCompleted(false)
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse AI revision JSON: {}", e.getMessage());
            return null;
        }
    }

    private SlotRevision buildFallbackRevision(Student student, TimetableSlot slot,
                                              MaterialTopicReader.TopicDetail detail, String subjectName) {
        String topic = detail.getTopic();
        String summary = String.format("High-yield revision for %s in %s. Master core definitions, fundamental properties, problem-solving methodologies, and common boundary conditions to excel in upcoming assessments.", topic, subjectName);

        List<String> concepts = List.of(
                topic + " Definitions",
                "Core Properties & Principles",
                "Step-by-Step Problem Solving",
                "Practical Applications"
        );

        List<FormulaItem> formulas = List.of(
                FormulaItem.builder()
                        .name("Standard Characteristic Rule")
                        .formula("\\Delta = b^2 - 4ac")
                        .explanation("Evaluates discriminant and nature of solutions in standard quadratic representations.")
                        .build(),
                FormulaItem.builder()
                        .name("Asymptotic Complexity Bound")
                        .formula("T(n) = O(n \\log n)")
                        .explanation("Optimal divide-and-conquer runtime efficiency for standard structured operations.")
                        .build()
        );

        List<QuizQuestion> quiz = List.of(
                QuizQuestion.builder()
                        .id(1)
                        .question("What is the primary objective when analyzing " + topic + "?")
                        .options(List.of(
                                "To understand fundamental definitions and apply them to standard problems",
                                "To bypass foundational proofs without verification",
                                "To only memorize equations without understanding derivations",
                                "None of the above"
                        ))
                        .correctOptionIndex(0)
                        .explanation("Mastering foundational definitions is essential for applying concepts to varied exam questions.")
                        .build(),
                QuizQuestion.builder()
                        .id(2)
                        .question("Which of the following is a key property of " + topic + "?")
                        .options(List.of(
                                "Deterministic and mathematically verifiable behavior",
                                "Completely random outputs without patterns",
                                "Undefined domain boundary",
                                "Inapplicability to real-world systems"
                        ))
                        .correctOptionIndex(0)
                        .explanation("Subject principles maintain mathematically verifiable consistency across all valid domains.")
                        .build(),
                QuizQuestion.builder()
                        .id(3)
                        .question("When solving problems in " + topic + ", what is the first recommended step?")
                        .options(List.of(
                                "Identify known variables and state governing formulas",
                                "Guess the answer before reading constraints",
                                "Skip to the final calculation step",
                                "Ignore initial boundary conditions"
                        ))
                        .correctOptionIndex(0)
                        .explanation("Writing down given parameters and governing formulas prevents arithmetic and conceptual errors.")
                        .build(),
                QuizQuestion.builder()
                        .id(4)
                        .question("What is a common pitfall to watch out for in " + topic + "?")
                        .options(List.of(
                                "Neglecting negative signs or boundary limits",
                                "Checking unit consistency",
                                "Verifying step-by-step logic",
                                "Writing neat formulas"
                        ))
                        .correctOptionIndex(0)
                        .explanation("Boundary condition mistakes and sign errors account for the majority of marks lost in this topic.")
                        .build(),
                QuizQuestion.builder()
                        .id(5)
                        .question("How should you verify your final result in " + topic + "?")
                        .options(List.of(
                                "Substitute values back into the original equation to check balance",
                                "Submit immediately without review",
                                "Erase all intermediate working",
                                "Assume calculation is always correct"
                        ))
                        .correctOptionIndex(0)
                        .explanation("Back-substitution and dimensional analysis provide rapid verification of solved results.")
                        .build()
        );

        List<String> weakAreas = List.of(
                "Overlooking boundary constraints or domain limits during problem setup.",
                "Rushing through intermediate algebraic / algorithmic transformations.",
                "Failing to verify unit consistency in multi-step questions."
        );

        List<String> quickPoints = List.of(
                "Always check initial conditions before applying governing theorems.",
                "Verify dimensional and unit homogeneity across intermediate steps.",
                "Memorize high-yield formulas and standard solved patterns.",
                "Review edge cases (zero values, infinity, empty sets, negative inputs)."
        );

        try {
            return SlotRevision.builder()
                    .student(student)
                    .timetableSlot(slot)
                    .topic(topic)
                    .summary(summary)
                    .keyConcepts(objectMapper.writeValueAsString(concepts))
                    .importantFormulas(objectMapper.writeValueAsString(formulas))
                    .quizQuestions(objectMapper.writeValueAsString(quiz))
                    .weakAreas(objectMapper.writeValueAsString(weakAreas))
                    .quickRevisionPoints(objectMapper.writeValueAsString(quickPoints))
                    .score(0)
                    .isCompleted(false)
                    .build();
        } catch (Exception e) {
            log.error("Failed to build fallback revision: {}", e.getMessage());
            throw new RuntimeException("Could not initialize revision experience");
        }
    }

    private SlotRevisionResponse mapToResponse(SlotRevision rev, TimetableSlot slot) {
        String subjectName = "Subject";
        String topic = rev.getTopic();
        String chapter = extractChapter(topic);

        if (slot != null && slot.getSubject() != null) {
            subjectName = slot.getSubject().getSubjectName();
        }

        List<String> keyConcepts = parseList(rev.getKeyConcepts(), new TypeReference<List<String>>() {});
        List<FormulaItem> formulas = parseList(rev.getImportantFormulas(), new TypeReference<List<FormulaItem>>() {});
        List<QuizQuestion> quiz = parseList(rev.getQuizQuestions(), new TypeReference<List<QuizQuestion>>() {});
        List<String> weakAreas = parseList(rev.getWeakAreas(), new TypeReference<List<String>>() {});
        List<String> quickPoints = parseList(rev.getQuickRevisionPoints(), new TypeReference<List<String>>() {});

        return SlotRevisionResponse.builder()
                .id(rev.getId())
                .slotId(rev.getTimetableSlot() != null ? rev.getTimetableSlot().getId() : null)
                .topic(rev.getTopic())
                .chapter(chapter)
                .subjectName(subjectName)
                .summary(rev.getSummary())
                .keyConcepts(keyConcepts)
                .importantFormulas(formulas)
                .quizQuestions(quiz)
                .weakAreas(weakAreas)
                .quickRevisionPoints(quickPoints)
                .score(rev.getScore())
                .isCompleted(rev.getIsCompleted())
                .completedAt(rev.getCompletedAt())
                .createdAt(rev.getCreatedAt())
                .build();
    }

    private String extractChapter(String topicLabel) {
        if (topicLabel == null || topicLabel.isBlank()) return "General";
        if (topicLabel.contains(" - ")) {
            String[] parts = topicLabel.split(" - ", 2);
            return parts[0].replaceAll("^(Final revision|Revision|Practice|Weak-area drill|Exam drill|Recap):\\s*", "").trim();
        }
        return "Core Curriculum";
    }

    private <T> List<T> parseList(String json, TypeReference<List<T>> typeRef) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (Exception e) {
            log.debug("Could not parse revision JSON list: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}

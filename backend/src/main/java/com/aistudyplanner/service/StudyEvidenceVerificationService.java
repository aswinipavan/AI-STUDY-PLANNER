package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.VerificationStatus;
import com.aistudyplanner.model.dto.response.StudyEvidenceResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.StudyEvidenceSubmission;
import com.aistudyplanner.model.entity.TimetableSlot;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.StudyEvidenceSubmissionRepository;
import com.aistudyplanner.repository.TimetableSlotRepository;
import com.aistudyplanner.service.ai.AiProviderGateway;
import com.aistudyplanner.service.ai.AiRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudyEvidenceVerificationService {

    private final TimetableSlotRepository timetableSlotRepository;
    private final StudentRepository studentRepository;
    private final StudyEvidenceSubmissionRepository evidenceRepository;
    private final StorageService storageService;
    private final AiProviderGateway aiProviderGateway;
    private final MaterialTopicReader materialTopicReader;
    private final ObjectMapper objectMapper;

    private static final int PASSING_SCORE_THRESHOLD = 70;
    private static final long MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

    /**
     * Uploads proof evidence for a specific timetable session and runs AI verification.
     */
    @Transactional
    public StudyEvidenceResponse submitAndVerifyEvidence(UUID studentId, UUID slotId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Evidence file must not be empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Evidence file exceeds maximum allowed size of 15MB");
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        TimetableSlot slot = timetableSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable slot not found"));

        if (!slot.getTimetable().getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Slot does not belong to the authenticated student");
        }

        // Validate that the slot is not in the future
        LocalDate slotDate = slot.getSlotDate();
        if (slotDate == null && slot.getTimetable().getWeekStartDate() != null && slot.getDayOfWeek() != null) {
            slotDate = slot.getTimetable().getWeekStartDate().plusDays(slot.getDayOfWeek());
        }
        LocalDate today = LocalDate.now();
        if (slotDate != null && slotDate.isAfter(today)) {
            throw new IllegalArgumentException("Cannot submit completion proof for future sessions scheduled on " + slotDate);
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "evidence.pdf";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            log.error("Failed to read uploaded evidence bytes for slot {}: {}", slotId, e.getMessage());
            throw new IllegalArgumentException("Failed to read uploaded file contents");
        }

        // Upload to durable storage
        String sanitizedFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String objectPath = String.format("%s/%s_%s_%s", studentId, slotId, UUID.randomUUID(), sanitizedFilename);
        String fileUrl = storageService.upload("evidence", objectPath, bytes, contentType);

        // Extract evidence text content
        String extractedEvidenceText = extractContent(bytes, contentType, originalFilename);

        // Perform AI Verification
        VerificationResult result = verifyEvidenceWithAi(slot, student, originalFilename, extractedEvidenceText);

        // Persist StudyEvidenceSubmission
        StudyEvidenceSubmission submission = StudyEvidenceSubmission.builder()
                .timetableSlot(slot)
                .student(student)
                .fileName(originalFilename)
                .fileUrl(fileUrl)
                .fileType(contentType)
                .fileSizeBytes(file.getSize())
                .verificationStatus(result.status)
                .score(result.score)
                .summary(result.summary)
                .matchedTopics(writeJsonList(result.matchedTopics))
                .missingTopics(writeJsonList(result.missingTopics))
                .feedback(result.feedback)
                .confidence(result.confidence)
                .verifiedAt(OffsetDateTime.now())
                .isUsedForCompletion(false)
                .build();

        submission = evidenceRepository.save(submission);
        log.info("Saved evidence submission {} for slot {}: status={}, score={}", submission.getId(), slotId, result.status, result.score);

        return toResponse(submission);
    }

    /**
     * Fetches the latest evidence submission for a timetable slot.
     */
    @Transactional(readOnly = true)
    public StudyEvidenceResponse getLatestEvidenceForSlot(UUID studentId, UUID slotId) {
        TimetableSlot slot = timetableSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Slot not found"));

        if (!slot.getTimetable().getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Slot does not belong to student");
        }

        return evidenceRepository.findTopByTimetableSlotIdAndStudentIdOrderBySubmittedAtDesc(slotId, studentId)
                .map(this::toResponse)
                .orElse(null);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Evidence Content Extraction
    // ─────────────────────────────────────────────────────────────────────────────

    private String extractContent(byte[] bytes, String contentType, String filename) {
        String lowerName = filename.toLowerCase();
        String lowerType = contentType.toLowerCase();

        if (lowerName.endsWith(".pdf") || lowerType.contains("pdf")) {
            try (PDDocument doc = Loader.loadPDF(bytes)) {
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setSortByPosition(true);
                String text = stripper.getText(doc);
                if (text != null && !text.isBlank()) {
                    return text.trim();
                }
            } catch (Exception e) {
                log.warn("PDFBox extraction failed for evidence file {}: {}", filename, e.getMessage());
            }
        }

        if (lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".java")
                || lowerName.endsWith(".py") || lowerName.endsWith(".json") || lowerType.contains("text")) {
            try {
                return new String(bytes, StandardCharsets.UTF_8).trim();
            } catch (Exception ignored) {}
        }

        if (lowerName.matches(".*\\.(jpg|jpeg|png|webp|gif)") || lowerType.contains("image")) {
            return String.format("[Visual Evidence / Handwritten Notes Image: %s (%d bytes)]", filename, bytes.length);
        }

        return String.format("[Document Evidence: %s (%d bytes)]", filename, bytes.length);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // AI Verification Engine
    // ─────────────────────────────────────────────────────────────────────────────

    private VerificationResult verifyEvidenceWithAi(TimetableSlot slot, Student student, String filename, String evidenceContent) {
        String subjectName = slot.getSubject() != null ? slot.getSubject().getSubjectName() : "General Studies";
        String topic = slot.getTopic() != null ? slot.getTopic() : "Scheduled Session Topic";

        MaterialTopicReader.TopicDetail topicDetail = materialTopicReader.resolveTopicDetail(
                student.getId(),
                slot.getSubject() != null ? slot.getSubject().getId() : null,
                slot.getTopic(),
                subjectName
        );

        String chapter = topicDetail.getChapter() != null ? topicDetail.getChapter() : "Core Module";
        String materialTitle = topicDetail.getMaterialTitle() != null ? topicDetail.getMaterialTitle() : "Course Materials";
        List<String> whatToStudy = topicDetail.getWhatToStudy() != null ? topicDetail.getWhatToStudy() : List.of();

        // If evidence extraction returned nothing readable:
        if (evidenceContent == null || evidenceContent.isBlank() || evidenceContent.length() < 10) {
            return VerificationResult.builder()
                    .status(VerificationStatus.REVIEW_REQUIRED)
                    .score(0)
                    .summary("The submitted evidence could not be reliably extracted or read. Please upload a clear document or notes file.")
                    .matchedTopics(List.of())
                    .missingTopics(List.of(topic))
                    .feedback("Ensure your document contains legible text, problem solutions, or summary notes related to " + topic + ".")
                    .confidence(50)
                    .build();
        }

        // Limit evidence content to avoid token blowup
        String trimmedEvidence = evidenceContent.length() > 3000 ? evidenceContent.substring(0, 3000) + "... [truncated]" : evidenceContent;

        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an expert AI Study Verification Examiner. Your job is to strictly and objectively verify whether a student's uploaded study evidence demonstrates genuine completion of their assigned study session.\n\n");
        prompt.append("ASSIGNED STUDY TASK:\n");
        prompt.append("- Subject: ").append(subjectName).append("\n");
        prompt.append("- Topic: ").append(topic).append("\n");
        prompt.append("- Chapter: ").append(chapter).append("\n");
        prompt.append("- Reference Material: ").append(materialTitle).append("\n");
        if (!whatToStudy.isEmpty()) {
            prompt.append("- Key Concepts to Cover:\n");
            for (String item : whatToStudy) {
                prompt.append("  ").append(item).append("\n");
            }
        }
        if (slot.getNotes() != null) {
            prompt.append("- Session Notes: ").append(slot.getNotes()).append("\n");
        }

        prompt.append("\nSTUDENT'S SUBMITTED PROOF EVIDENCE (File: ").append(filename).append("):\n");
        prompt.append("\"\"\"\n").append(trimmedEvidence).append("\n\"\"\"\n\n");

        prompt.append("EVALUATION CRITERIA:\n");
        prompt.append("1. Topic Relevance: Does the evidence cover concepts related to '").append(topic).append("' in ").append(subjectName).append("?\n");
        prompt.append("2. Depth & Substance: Does it demonstrate actual study (e.g. definitions, worked examples, derivations, summary notes, problem sets) rather than irrelevant text or another subject?\n");
        prompt.append("3. Paraphrasing Tolerance: Allow student-written notes and paraphrasing. Do not demand exact verbatim wording from textbooks.\n");
        prompt.append("4. Scoring Guidelines:\n");
        prompt.append("   - 80-100: Strong, comprehensive coverage of the assigned topic with clear notes/work. (status: APPROVED)\n");
        prompt.append("   - 70-79: Adequate coverage of main concepts. (status: APPROVED)\n");
        prompt.append("   - 40-69: Partial or incomplete work, or touches only peripheral concepts. (status: NEEDS_MORE_WORK)\n");
        prompt.append("   - 0-39: Unrelated topic, wrong subject, blank, or insufficient substance. (status: NEEDS_MORE_WORK)\n");
        prompt.append("   - Use REVIEW_REQUIRED only if the evidence appears corrupted or impossible to evaluate.\n\n");

        prompt.append("OUTPUT FORMAT:\n");
        prompt.append("You MUST return ONLY a valid JSON object with EXACTLY these keys (no markdown formatting outside the JSON, no backticks, just raw JSON):\n");
        prompt.append("{\n");
        prompt.append("  \"status\": \"APPROVED\" | \"NEEDS_MORE_WORK\" | \"REVIEW_REQUIRED\",\n");
        prompt.append("  \"score\": <integer 0-100>,\n");
        prompt.append("  \"summary\": \"<1-2 sentence assessment of what was verified>\",\n");
        prompt.append("  \"matchedTopics\": [\"<topic 1>\", \"<topic 2>\"],\n");
        prompt.append("  \"missingTopics\": [\"<missing concept 1>\"],\n");
        prompt.append("  \"feedback\": \"<Actionable advice for the student>\",\n");
        prompt.append("  \"confidence\": <integer 0-100>\n");
        prompt.append("}\n");

        try {
            String rawResponse = aiProviderGateway.complete(AiRequest.of(prompt.toString(), "verify-study-evidence")).text();
            return parseAiVerificationResponse(rawResponse, topic);
        } catch (Exception e) {
            log.warn("AI verification call failed for slot {}: {}. Falling back to deterministic review state.", slot.getId(), e.getMessage());
            return deterministicFallback(topic, subjectName, trimmedEvidence);
        }
    }

    private VerificationResult parseAiVerificationResponse(String rawResponse, String fallbackTopic) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return VerificationResult.builder()
                    .status(VerificationStatus.REVIEW_REQUIRED)
                    .score(50)
                    .summary("AI verification service provided an empty response.")
                    .matchedTopics(List.of())
                    .missingTopics(List.of(fallbackTopic))
                    .feedback("Please resubmit your evidence or contact support.")
                    .confidence(50)
                    .build();
        }

        try {
            // Strip any wrapping markdown `json ... ` if present
            String cleaned = rawResponse.trim();
            if (cleaned.startsWith("`")) {
                cleaned = cleaned.replaceAll("^`(?:json)?", "").replaceAll("`$", "").trim();
            }

            JsonNode root = objectMapper.readTree(cleaned);

            String statusStr = root.path("status").asText("REVIEW_REQUIRED").toUpperCase();
            VerificationStatus status;
            try {
                status = VerificationStatus.valueOf(statusStr);
            } catch (Exception ex) {
                status = VerificationStatus.REVIEW_REQUIRED;
            }

            int score = root.path("score").asInt(50);
            score = Math.max(0, Math.min(100, score));

            // Align status with score threshold
            if (status == VerificationStatus.APPROVED && score < PASSING_SCORE_THRESHOLD) {
                status = VerificationStatus.NEEDS_MORE_WORK;
            } else if (status == VerificationStatus.NEEDS_MORE_WORK && score >= PASSING_SCORE_THRESHOLD) {
                status = VerificationStatus.APPROVED;
            }

            String summary = root.path("summary").asText("Evidence analyzed against assigned topic.");
            String feedback = root.path("feedback").asText("Keep up your study consistency.");
            int confidence = root.path("confidence").asInt(85);

            List<String> matchedTopics = new ArrayList<>();
            if (root.has("matchedTopics") && root.get("matchedTopics").isArray()) {
                for (JsonNode n : root.get("matchedTopics")) {
                    matchedTopics.add(n.asText());
                }
            }

            List<String> missingTopics = new ArrayList<>();
            if (root.has("missingTopics") && root.get("missingTopics").isArray()) {
                for (JsonNode n : root.get("missingTopics")) {
                    missingTopics.add(n.asText());
                }
            }

            return VerificationResult.builder()
                    .status(status)
                    .score(score)
                    .summary(summary)
                    .matchedTopics(matchedTopics)
                    .missingTopics(missingTopics)
                    .feedback(feedback)
                    .confidence(confidence)
                    .build();

        } catch (Exception e) {
            log.warn("Failed to parse AI verification JSON: {}. Raw response: {}", e.getMessage(), rawResponse);
            return VerificationResult.builder()
                    .status(VerificationStatus.REVIEW_REQUIRED)
                    .score(50)
                    .summary("Verification completed with manual review required.")
                    .matchedTopics(List.of(fallbackTopic))
                    .missingTopics(List.of())
                    .feedback("Evidence submitted successfully. Please ensure all key derivation steps are visible.")
                    .confidence(60)
                    .build();
        }
    }

    private VerificationResult deterministicFallback(String topic, String subject, String evidenceText) {
        String lowerEvidence = evidenceText.toLowerCase();
        String lowerTopic = topic.toLowerCase();
        String lowerSubject = subject.toLowerCase();

        boolean subjectMatch = lowerEvidence.contains(lowerSubject);
        boolean topicMatch = lowerEvidence.contains(lowerTopic) || Arrays.stream(lowerTopic.split("\\s+"))
                .filter(w -> w.length() > 3)
                .anyMatch(lowerEvidence::contains);

        if (subjectMatch && topicMatch && evidenceText.length() > 100) {
            return VerificationResult.builder()
                    .status(VerificationStatus.APPROVED)
                    .score(85)
                    .summary("Evidence matches topic '" + topic + "' for " + subject + ".")
                    .matchedTopics(List.of(topic, subject))
                    .missingTopics(List.of())
                    .feedback("Good work covering the core concepts of " + topic + ".")
                    .confidence(80)
                    .build();
        } else if (evidenceText.length() > 50) {
            return VerificationResult.builder()
                    .status(VerificationStatus.NEEDS_MORE_WORK)
                    .score(55)
                    .summary("Evidence partially demonstrates work, but lacks sufficient coverage of " + topic + ".")
                    .matchedTopics(subjectMatch ? List.of(subject) : List.of())
                    .missingTopics(List.of(topic))
                    .feedback("Include specific notes, formulas, or worked examples for " + topic + " to achieve approval.")
                    .confidence(70)
                    .build();
        }

        return VerificationResult.builder()
                .status(VerificationStatus.REVIEW_REQUIRED)
                .score(40)
                .summary("AI verification service is temporarily unavailable. Please upload a clear document.")
                .matchedTopics(List.of())
                .missingTopics(List.of(topic))
                .feedback("Verification service is offline. Please retry your submission.")
                .confidence(50)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Mappers
    // ─────────────────────────────────────────────────────────────────────────────

    private StudyEvidenceResponse toResponse(StudyEvidenceSubmission submission) {
        List<String> matched = readJsonList(submission.getMatchedTopics());
        List<String> missing = readJsonList(submission.getMissingTopics());

        return StudyEvidenceResponse.builder()
                .id(submission.getId())
                .slotId(submission.getTimetableSlot() != null ? submission.getTimetableSlot().getId() : null)
                .fileName(submission.getFileName())
                .fileUrl(submission.getFileUrl())
                .fileType(submission.getFileType())
                .fileSizeBytes(submission.getFileSizeBytes())
                .verificationStatus(submission.getVerificationStatus())
                .score(submission.getScore())
                .summary(submission.getSummary())
                .matchedTopics(matched)
                .missingTopics(missing)
                .feedback(submission.getFeedback())
                .confidence(submission.getConfidence())
                .verifiedAt(submission.getVerifiedAt())
                .isUsedForCompletion(submission.getIsUsedForCompletion())
                .submittedAt(submission.getSubmittedAt())
                .build();
    }

    private String writeJsonList(List<String> list) {
        if (list == null || list.isEmpty()) return "[]";
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<String> readJsonList(String json) {
        if (json == null || json.isBlank() || "[]".equals(json.trim())) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of(json);
        }
    }

    @lombok.Value
    @lombok.Builder
    public static class VerificationResult {
        VerificationStatus status;
        int score;
        String summary;
        List<String> matchedTopics;
        List<String> missingTopics;
        String feedback;
        int confidence;
    }
}

package com.aistudyplanner.service;

import com.aistudyplanner.model.entity.Material;
import com.aistudyplanner.repository.MaterialRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.UUID;

/**
 * Reads the topics that the NLP / document-intelligence pipeline extracted from a student's uploaded
 * material and turns them into the exact session labels used on timetable slots.
 *
 * <p>This exists as one shared component (rather than a copy in each service) because both the
 * initial generator and the adaptive re-planner must produce <em>byte-identical</em> labels: adaptive
 * planning decides "already covered" by comparing a candidate topic against the topics on completed
 * slots, so any drift in formatting between the two paths would silently re-teach finished topics.</p>
 *
 * <p>It never invents topics. When a subject has no processed material the topic list is empty and
 * the caller is expected to fall back to a subject-specific label of its own.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MaterialTopicReader {

    /** Slot topics are persisted in a 200-char column. */
    private static final int MAX_TOPIC_LENGTH = 200;

    private final MaterialRepository materialRepository;
    private final ObjectMapper objectMapper;

    /**
     * A subject's extracted material topics in natural document order (chapter/topic sequence
     * preserved), formatted as {@code "Chapter - Topic"} or just the topic name.
     *
     * @return an empty list when the subject has no processed material
     */
    public List<String> orderedTopics(UUID studentId, UUID subjectId) {
        List<Material> materials = materialRepository.findAllByStudentIdAndSubjectId(studentId, subjectId);
        if (materials == null || materials.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> topics = new ArrayList<>();
        for (Material material : materials) {
            topics.addAll(topicLabels(material));
        }
        return topics;
    }

    /**
     * Same as {@link #orderedTopics} but with duplicates removed, keeping first occurrence. Two
     * uploads covering the same chapter should not double-book the same study session.
     */
    public List<String> distinctOrderedTopics(UUID studentId, UUID subjectId) {
        return new ArrayList<>(new LinkedHashSet<>(orderedTopics(studentId, subjectId)));
    }

    /** Topic labels for a single material, in document order. Never null. */
    public List<String> topicLabels(Material material) {
        String topicsJson = material != null ? material.getExtractedTopics() : null;
        if (topicsJson == null || topicsJson.isBlank() || topicsJson.equals("[]")) {
            return Collections.emptyList();
        }

        List<String> labels = new ArrayList<>();
        try {
            List<Map<String, Object>> parsed = objectMapper.readValue(
                    topicsJson, new TypeReference<List<Map<String, Object>>>() {});
            for (Map<String, Object> t : parsed) {
                String name = t.get("name") instanceof String ? ((String) t.get("name")).trim() : null;
                if (name == null || name.isBlank()) continue;
                String chapter = t.get("chapter") instanceof String ? ((String) t.get("chapter")).trim() : null;
                String label;
                if (chapter != null && !chapter.isBlank()
                        && !chapter.equalsIgnoreCase(name) && !chapter.equalsIgnoreCase("General")) {
                    label = chapter + " - " + name;
                } else {
                    label = name;
                }
                labels.add(truncate(label));
            }
        } catch (Exception e) {
            log.debug("Could not parse extractedTopics JSON for material {}: {}",
                    material.getId(), e.getMessage());
        }
        return labels;
    }

    /**
     * Mean 0–100 difficulty score across a subject's processed material, or empty when the pipeline
     * has not scored anything yet. Used as a real "material difficulty" planning signal.
     */
    public OptionalDouble averageMaterialDifficulty(UUID studentId, UUID subjectId) {
        List<Material> materials = materialRepository.findAllByStudentIdAndSubjectId(studentId, subjectId);
        if (materials == null || materials.isEmpty()) {
            return OptionalDouble.empty();
        }
        return materials.stream()
                .filter(m -> m.getDifficultyScore() != null)
                .mapToDouble(m -> m.getDifficultyScore().doubleValue())
                .average();
    }

    /**
     * Rich metadata describing a study session topic, its source material, chapter, and what to study.
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class TopicDetail {
        private String topic;
        private String chapter;
        private UUID materialId;
        private String materialTitle;
        private List<String> whatToStudy;
        private String difficulty;
        private Integer difficultyScore;
    }

    /**
     * Resolves rich metadata for a given topic: source material, chapter, difficulty, and actionable
     * what-to-study bullet points from the processed document intelligence data.
     */
    public TopicDetail resolveTopicDetail(UUID studentId, UUID subjectId, String topicLabel, String subjectName) {
        String canonicalKey = canonicalTopicKey(topicLabel);
        List<Material> materials = (studentId != null && subjectId != null)
                ? materialRepository.findAllByStudentIdAndSubjectId(studentId, subjectId)
                : Collections.emptyList();

        if (materials != null && !materials.isEmpty()) {
            for (Material material : materials) {
                String topicsJson = material.getExtractedTopics();
                if (topicsJson == null || topicsJson.isBlank() || topicsJson.equals("[]")) continue;

                try {
                    List<Map<String, Object>> parsedTopics = objectMapper.readValue(
                            topicsJson, new TypeReference<List<Map<String, Object>>>() {});

                    for (Map<String, Object> t : parsedTopics) {
                        String name = t.get("name") instanceof String ? ((String) t.get("name")).trim() : "";
                        String chapter = t.get("chapter") instanceof String ? ((String) t.get("chapter")).trim() : "";
                        String fullLabel = (!chapter.isBlank() && !chapter.equalsIgnoreCase("General") && !chapter.equalsIgnoreCase(name))
                                ? chapter + " - " + name
                                : name;

                        if (canonicalTopicKey(fullLabel).equals(canonicalKey) || canonicalTopicKey(name).equals(canonicalKey)) {
                            String materialTitle = material.getTitle() != null && !material.getTitle().isBlank()
                                    ? material.getTitle()
                                    : material.getFileName();

                            List<String> studyPoints = buildWhatToStudyPoints(t, material, chapter, name);

                            return TopicDetail.builder()
                                    .topic(fullLabel.isBlank() ? topicLabel : fullLabel)
                                    .chapter(chapter.isBlank() ? "General" : chapter)
                                    .materialId(material.getId())
                                    .materialTitle(materialTitle)
                                    .whatToStudy(studyPoints)
                                    .difficulty(material.getOverallDifficulty() != null ? material.getOverallDifficulty() : "MEDIUM")
                                    .difficultyScore(material.getDifficultyScore() != null ? material.getDifficultyScore() : 50)
                                    .build();
                        }
                    }
                } catch (Exception e) {
                    log.debug("Error parsing extracted topics for material {}: {}", material.getId(), e.getMessage());
                }
            }

            // If no exact topic matched but materials exist for the subject:
            Material firstMat = materials.get(0);
            String title = firstMat.getTitle() != null && !firstMat.getTitle().isBlank()
                    ? firstMat.getTitle() : firstMat.getFileName();
            return TopicDetail.builder()
                    .topic(topicLabel != null ? topicLabel : (subjectName != null ? subjectName : "Study Session"))
                    .chapter(extractChapterFromTopic(topicLabel))
                    .materialId(firstMat.getId())
                    .materialTitle(title)
                    .whatToStudy(List.of(
                            "• Master core definitions and key theorems from " + title,
                            "• Practice step-by-step worked examples and review exercises",
                            "• Self-assess understanding of " + (topicLabel != null ? topicLabel : "assigned topic")
                    ))
                    .difficulty(firstMat.getOverallDifficulty() != null ? firstMat.getOverallDifficulty() : "MEDIUM")
                    .difficultyScore(firstMat.getDifficultyScore() != null ? firstMat.getDifficultyScore() : 50)
                    .build();
        }

        // Fallback when no materials exist for the subject:
        String subName = subjectName != null ? subjectName : "Subject";
        return TopicDetail.builder()
                .topic(topicLabel != null ? topicLabel : subName)
                .chapter(extractChapterFromTopic(topicLabel))
                .materialId(null)
                .materialTitle(null)
                .whatToStudy(List.of(
                        "• Review standard lecture syllabus and textbook chapters for " + subName,
                        "• Practice standard problems and exam-style questions",
                        "• Upload lecture notes / PDFs in the Materials tab for AI-extracted topic breakdowns"
                ))
                .difficulty("MEDIUM")
                .difficultyScore(50)
                .build();
    }

    private String extractChapterFromTopic(String topicLabel) {
        if (topicLabel == null || topicLabel.isBlank()) return "General";
        if (topicLabel.contains(" - ")) {
            String[] parts = topicLabel.split(" - ", 2);
            return parts[0].replaceAll("^(Final revision|Revision|Practice|Weak-area drill|Exam drill|Recap):\\s*", "").trim();
        }
        return "Core Curriculum";
    }

    private List<String> buildWhatToStudyPoints(Map<String, Object> topicMap, Material material, String chapter, String topicName) {
        List<String> points = new ArrayList<>();

        // 1. Keywords if present
        Object kwObj = topicMap.get("keywords");
        if (kwObj instanceof List) {
            List<?> kwList = (List<?>) kwObj;
            List<String> kwStrings = new ArrayList<>();
            for (Object k : kwList) {
                if (k != null) kwStrings.add(k.toString());
            }
            if (!kwStrings.isEmpty()) {
                points.add("• Key definitions & terminology: " + String.join(", ", kwStrings));
            }
        }

        // 2. Chapter subtopics from extractedChapters
        String chaptersJson = material.getExtractedChapters();
        if (chaptersJson != null && !chaptersJson.isBlank()) {
            try {
                List<Map<String, Object>> parsedChapters = objectMapper.readValue(
                        chaptersJson, new TypeReference<List<Map<String, Object>>>() {});
                for (Map<String, Object> ch : parsedChapters) {
                    String title = ch.get("title") instanceof String ? ((String) ch.get("title")).trim() : "";
                    if (title.equalsIgnoreCase(chapter)) {
                        Object subObj = ch.get("subtopics");
                        if (subObj instanceof List) {
                            List<?> subList = (List<?>) subObj;
                            List<String> subs = new ArrayList<>();
                            for (Object s : subList) {
                                if (s != null) subs.add(s.toString());
                            }
                            if (!subs.isEmpty()) {
                                points.add("• Chapter subtopics: " + String.join(", ", subs.subList(0, Math.min(subs.size(), 4))));
                            }
                        }
                        String snippet = ch.get("contentSnippet") instanceof String ? ((String) ch.get("contentSnippet")).trim() : "";
                        if (!snippet.isBlank()) {
                            points.add("• Core focus: " + (snippet.length() > 100 ? snippet.substring(0, 97) + "…" : snippet));
                        }
                        break;
                    }
                }
            } catch (Exception ignored) {}
        }

        // 3. Actionable study guidance
        String title = material.getTitle() != null && !material.getTitle().isBlank() ? material.getTitle() : material.getFileName();
        points.add("• Work through practical examples and solved problems from " + title);
        points.add("• Review high-yield formulas and concepts related to " + topicName);

        return points;
    }

    /** Clamp a label to the persisted column width. */
    public static String truncate(String label) {
        if (label == null) return null;
        return label.length() > MAX_TOPIC_LENGTH ? label.substring(0, MAX_TOPIC_LENGTH) : label;
    }

    /**
     * Canonical form of a slot topic for "have I already studied this?" comparisons: the reinforcement
     * prefixes are stripped and case/whitespace normalised, so {@code "Revision: Chapter 2 - A* Search"}
     * and {@code "Chapter 2 - A* Search"} are recognised as the same underlying material.
     */
    public static String canonicalTopicKey(String topic) {
        if (topic == null) return "";
        String value = topic.trim();
        for (String prefix : new String[] {
                "Final revision:", "Final preparation:", "Revision:", "Practice:", "Weak-area drill:",
                "Exam drill:", "Recap:" }) {
            if (value.regionMatches(true, 0, prefix, 0, prefix.length())) {
                value = value.substring(prefix.length()).trim();
                break;
            }
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}

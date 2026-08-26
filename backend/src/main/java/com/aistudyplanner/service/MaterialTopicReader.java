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

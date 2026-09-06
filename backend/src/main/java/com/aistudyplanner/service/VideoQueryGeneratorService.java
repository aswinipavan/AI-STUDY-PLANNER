package com.aistudyplanner.service;

import com.aistudyplanner.service.MaterialTopicReader.TopicDetail;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Generates high-signal educational search queries from study session topic metadata.
 *
 * <p>Constructs specific queries combining the exact topic, chapter, subject, and learning
 * intent keywords to ensure search results return pedagogical lectures, tutorials, and worked
 * examples rather than generic subject overviews.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VideoQueryGeneratorService {

    private static final Pattern PREFIX_PATTERN = Pattern.compile(
            "^(Final revision|Final preparation|Revision|Practice|Weak-area drill|Exam drill|Recap):\\s*",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern LATEX_FORMULA_PATTERN = Pattern.compile(
            "\\$[^$]+\\$|\\\\[a-zA-Z]+|[≈=≠≤≥+\\-*/^_{}\\\\(\\\\)\\[\\]]");

    private static final Pattern PUNCTUATION_CLEANER = Pattern.compile(
            "[^a-zA-Z0-9\\s\\-]");

    /**
     * Generates a ranked list of 3-4 distinct search queries for a study slot.
     *
     * @param topicDetail rich metadata of the study session
     * @param subjectName subject title (e.g. "Engineering Mathematics III")
     * @return non-empty list of educational search queries
     */
    public List<String> generateQueries(TopicDetail topicDetail, String subjectName) {
        String rawTopic = topicDetail != null && topicDetail.getTopic() != null ? topicDetail.getTopic() : "";
        String chapter = topicDetail != null && topicDetail.getChapter() != null ? topicDetail.getChapter() : "";
        String cleanSubject = sanitize(subjectName != null ? subjectName : "");

        String cleanTopic = cleanTopicString(rawTopic);
        String cleanChapter = cleanChapterString(chapter);

        Set<String> queries = new LinkedHashSet<>();

        // If the topic is very brief or empty, fallback to chapter + subject
        if (cleanTopic.isBlank()) {
            if (!cleanChapter.isBlank() && !cleanChapter.equalsIgnoreCase("General")) {
                cleanTopic = cleanChapter;
            } else if (!cleanSubject.isBlank()) {
                cleanTopic = cleanSubject;
            } else {
                cleanTopic = "Educational Study Concepts";
            }
        }

        // Query 1: Exact Topic + Subject context (Direct precision)
        if (!cleanSubject.isBlank() && !cleanTopic.toLowerCase(Locale.ROOT).contains(cleanSubject.toLowerCase(Locale.ROOT))) {
            queries.add(cleanTopic + " " + cleanSubject);
        } else {
            queries.add(cleanTopic);
        }

        // Query 2: Topic + Chapter + Subject (Pedagogical depth)
        if (!cleanChapter.isBlank() && !cleanChapter.equalsIgnoreCase("General")
                && !cleanTopic.toLowerCase(Locale.ROOT).contains(cleanChapter.toLowerCase(Locale.ROOT))) {
            StringBuilder sb = new StringBuilder(cleanTopic);
            sb.append(" ").append(cleanChapter);
            if (!cleanSubject.isBlank() && !cleanTopic.toLowerCase(Locale.ROOT).contains(cleanSubject.toLowerCase(Locale.ROOT))) {
                sb.append(" ").append(cleanSubject);
            }
            queries.add(sb.toString().trim());
        }

        // Query 3: Topic + Solved Examples / Worked Tutorial
        queries.add(cleanTopic + " solved examples tutorial");

        // Query 4: Topic + Lecture / Concept explanation
        queries.add(cleanTopic + " concept explanation lecture");

        // Query 5 (Optional high-yield keywords if available from topicDetail)
        if (topicDetail != null && topicDetail.getWhatToStudy() != null && !topicDetail.getWhatToStudy().isEmpty()) {
            String extractedKeywords = extractKeyKeywords(topicDetail.getWhatToStudy());
            if (!extractedKeywords.isBlank() && !cleanTopic.toLowerCase(Locale.ROOT).contains(extractedKeywords.toLowerCase(Locale.ROOT))) {
                queries.add(cleanTopic + " " + extractedKeywords);
            }
        }

        log.debug("Generated {} video search queries for topic '{}' (subject: '{}')",
                queries.size(), rawTopic, subjectName);

        return new ArrayList<>(queries);
    }

    /**
     * Cleans topic strings by removing timetable schedule prefixes, latex formulas, and special characters.
     */
    public String cleanTopicString(String rawTopic) {
        if (rawTopic == null || rawTopic.isBlank()) return "";

        // 1. Strip schedule prefixes like "Revision: ", "Practice: "
        String step1 = PREFIX_PATTERN.matcher(rawTopic.trim()).replaceAll("").trim();

        // 2. Handle "Chapter - Topic" delimiter if present
        if (step1.contains(" - ")) {
            String[] parts = step1.split(" - ", 2);
            if (parts.length > 1 && !parts[1].isBlank()) {
                step1 = parts[1].trim();
            }
        }

        // 3. Clean latex mathematical expressions and symbol clutter
        String step2 = LATEX_FORMULA_PATTERN.matcher(step1).replaceAll(" ").trim();

        // 4. Remove unwanted punctuation while preserving alphabets, numbers, hyphens
        String step3 = PUNCTUATION_CLEANER.matcher(step2).replaceAll(" ").trim();

        // 5. Normalise consecutive whitespaces
        return step3.replaceAll("\\s+", " ").trim();
    }

    /**
     * Cleans chapter names (e.g. "Chapter 4 - Fourier Analysis" -> "Fourier Analysis" or "Chapter 4 Fourier Analysis").
     */
    public String cleanChapterString(String rawChapter) {
        if (rawChapter == null || rawChapter.isBlank() || rawChapter.equalsIgnoreCase("General")) return "";
        String cleaned = PUNCTUATION_CLEANER.matcher(rawChapter).replaceAll(" ").replaceAll("\\s+", " ").trim();
        return cleaned;
    }

    private String sanitize(String input) {
        if (input == null) return "";
        return PUNCTUATION_CLEANER.matcher(input).replaceAll(" ").replaceAll("\\s+", " ").trim();
    }

    private String extractKeyKeywords(List<String> whatToStudyPoints) {
        if (whatToStudyPoints == null) return "";
        for (String point : whatToStudyPoints) {
            if (point != null && point.toLowerCase(Locale.ROOT).contains("definitions & terminology:")) {
                int idx = point.indexOf(":");
                if (idx != -1 && idx + 1 < point.length()) {
                    String sub = point.substring(idx + 1).replace("•", "").trim();
                    String clean = sanitize(sub);
                    String[] tokens = clean.split("\\s+");
                    if (tokens.length > 0) {
                        return String.join(" ", Arrays.copyOfRange(tokens, 0, Math.min(tokens.length, 3)));
                    }
                }
            }
        }
        return "";
    }
}

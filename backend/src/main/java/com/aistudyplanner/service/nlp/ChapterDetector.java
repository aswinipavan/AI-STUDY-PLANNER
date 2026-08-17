package com.aistudyplanner.service.nlp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Detects chapters, units, modules, and major sections from academic document text.
 */
@Component
@Slf4j
public class ChapterDetector {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtractedChapter {
        private String title;
        private String chapterNumber;
        private List<String> subtopics;
        private String contentSnippet;
        private double confidence; // 0.0 to 1.0
    }

    // Pattern 1: Chapter / Unit / Module 1: Introduction to Data Structures
    private static final Pattern CHAPTER_PREFIX_PATTERN = Pattern.compile(
        "(?im)^(?:chapter|unit|module|part|lesson)\\s+([0-9ivxlcdm]+)[:\\.\\-\\s]+([^\n\r]+)$"
    );

    // Pattern 2: 1.0 or 1.1 Topic Title
    private static final Pattern NUMBERED_HEADING_PATTERN = Pattern.compile(
        "(?m)^([0-9]+(?:\\.[0-9]+)?)\\s+([A-Z][A-Za-z0-9\\s,\\-&/()]{3,80})$"
    );

    // Pattern 3: ALL-CAPS short heading lines
    private static final Pattern ALL_CAPS_HEADING_PATTERN = Pattern.compile(
        "(?m)^([A-Z0-9\\s,\\-&/]{4,60})$"
    );

    public List<ExtractedChapter> detectChapters(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return Collections.emptyList();
        }

        List<ExtractedChapter> chapters = new ArrayList<>();
        String[] lines = normalizedText.split("\n");

        ExtractedChapter currentChapter = null;
        StringBuilder currentContent = new StringBuilder();
        List<String> currentSubtopics = new ArrayList<>();

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            Matcher chMatcher = CHAPTER_PREFIX_PATTERN.matcher(line);
            Matcher numMatcher = NUMBERED_HEADING_PATTERN.matcher(line);

            if (chMatcher.matches()) {
                // Save previous chapter
                if (currentChapter != null) {
                    currentChapter.setSubtopics(new ArrayList<>(currentSubtopics));
                    currentChapter.setContentSnippet(truncateSnippet(currentContent.toString()));
                    chapters.add(currentChapter);
                }

                String number = chMatcher.group(1).trim();
                String title = cleanHeading(chMatcher.group(2).trim());
                currentChapter = ExtractedChapter.builder()
                        .chapterNumber(number)
                        .title(title.isEmpty() ? "Chapter " + number : title)
                        .subtopics(new ArrayList<>())
                        .confidence(0.95)
                        .build();
                currentContent = new StringBuilder();
                currentSubtopics = new ArrayList<>();
                continue;
            }

            if (numMatcher.matches()) {
                String sectionNum = numMatcher.group(1).trim();
                String sectionTitle = cleanHeading(numMatcher.group(2).trim());

                if (!sectionNum.contains(".")) {
                    // Major top-level section (e.g. "1 Introduction")
                    if (currentChapter != null) {
                        currentChapter.setSubtopics(new ArrayList<>(currentSubtopics));
                        currentChapter.setContentSnippet(truncateSnippet(currentContent.toString()));
                        chapters.add(currentChapter);
                    }

                    currentChapter = ExtractedChapter.builder()
                            .chapterNumber(sectionNum)
                            .title(sectionTitle)
                            .subtopics(new ArrayList<>())
                            .confidence(0.85)
                            .build();
                    currentContent = new StringBuilder();
                    currentSubtopics = new ArrayList<>();
                } else {
                    // Sub-section (e.g. "1.1 Binary Search")
                    if (currentChapter != null && !sectionTitle.isEmpty() && !currentSubtopics.contains(sectionTitle)) {
                        currentSubtopics.add(sectionTitle);
                    }
                }
                continue;
            }

            // Append to current chapter content
            if (currentContent.length() < 5000) {
                currentContent.append(line).append(" ");
            }
        }

        // Save last chapter
        if (currentChapter != null) {
            currentChapter.setSubtopics(new ArrayList<>(currentSubtopics));
            currentChapter.setContentSnippet(truncateSnippet(currentContent.toString()));
            chapters.add(currentChapter);
        }

        // Fallback: If no explicit chapter headers found, detect all-caps or split into logical sections
        if (chapters.isEmpty()) {
            chapters = detectFallbackSections(lines);
        }

        return chapters;
    }

    private List<ExtractedChapter> detectFallbackSections(String[] lines) {
        List<ExtractedChapter> fallbackList = new ArrayList<>();
        ExtractedChapter current = null;
        StringBuilder content = new StringBuilder();
        int sectionCounter = 1;

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            if (isLikelyHeading(trimmed)) {
                if (current != null) {
                    current.setContentSnippet(truncateSnippet(content.toString()));
                    fallbackList.add(current);
                }
                current = ExtractedChapter.builder()
                        .chapterNumber(String.valueOf(sectionCounter++))
                        .title(cleanHeading(trimmed))
                        .subtopics(new ArrayList<>())
                        .confidence(0.60)
                        .build();
                content = new StringBuilder();
            } else {
                if (current == null) {
                    current = ExtractedChapter.builder()
                            .chapterNumber("1")
                            .title("Overview & Fundamentals")
                            .subtopics(new ArrayList<>())
                            .confidence(0.50)
                            .build();
                }
                if (content.length() < 4000) {
                    content.append(trimmed).append(" ");
                }
            }
        }

        if (current != null) {
            current.setContentSnippet(truncateSnippet(content.toString()));
            fallbackList.add(current);
        }

        if (fallbackList.isEmpty()) {
            fallbackList.add(ExtractedChapter.builder()
                    .chapterNumber("1")
                    .title("Core Subject Concepts")
                    .subtopics(Collections.emptyList())
                    .contentSnippet("")
                    .confidence(0.40)
                    .build());
        }

        return fallbackList;
    }

    private boolean isLikelyHeading(String line) {
        if (line.length() < 4 || line.length() > 70) return false;
        if (line.endsWith(".") || line.endsWith(";") || line.endsWith(":")) return false;
        // All uppercase line
        if (line.equals(line.toUpperCase()) && line.matches(".*[A-Z].*")) return true;
        // Title Case line without punctuation
        return Character.isUpperCase(line.charAt(0)) && !line.contains(",") && !line.contains("  ");
    }

    private String cleanHeading(String heading) {
        return heading.replaceAll("^[\\d\\.\\-\\s]+", "")
                      .replaceAll("[\\:\\-\\._]+$", "")
                      .trim();
    }

    private String truncateSnippet(String text) {
        if (text == null) return "";
        String trimmed = text.trim();
        return trimmed.length() > 800 ? trimmed.substring(0, 800) + "..." : trimmed;
    }
}

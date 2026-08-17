package com.aistudyplanner.service.nlp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Extracts and normalizes academic topics and technical keywords from document content and detected chapters.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TopicExtractor {

    private final NlpTextPreprocessor preprocessor;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtractedTopic {
        private String name;
        private String chapter;
        private List<String> keywords;
        private double relevanceScore;
        private int estimatedMinutes;
    }

    /**
     * Extract structured topics from chapters and document text.
     */
    public List<ExtractedTopic> extractTopics(String fullText, List<ChapterDetector.ExtractedChapter> chapters) {
        List<ExtractedTopic> topics = new ArrayList<>();
        Set<String> seenTopicNames = new HashSet<>();

        // 1. Extract topics directly from detected chapter titles and subtopics
        for (ChapterDetector.ExtractedChapter ch : chapters) {
            String chapterName = ch.getTitle();

            // Add main chapter topic
            String normalizedCh = normalizeTopicName(chapterName);
            if (isValidTopicName(normalizedCh) && seenTopicNames.add(normalizedCh.toLowerCase())) {
                List<String> keywords = extractTopKeywordsForText(ch.getContentSnippet(), 5);
                topics.add(ExtractedTopic.builder()
                        .name(normalizedCh)
                        .chapter(chapterName)
                        .keywords(keywords)
                        .relevanceScore(0.95 * ch.getConfidence())
                        .estimatedMinutes(45)
                        .build());
            }

            // Add subtopics under this chapter
            if (ch.getSubtopics() != null) {
                for (String sub : ch.getSubtopics()) {
                    String normSub = normalizeTopicName(sub);
                    if (isValidTopicName(normSub) && seenTopicNames.add(normSub.toLowerCase())) {
                        topics.add(ExtractedTopic.builder()
                                .name(normSub)
                                .chapter(chapterName)
                                .keywords(extractTopKeywordsForText(normSub + " " + ch.getContentSnippet(), 4))
                                .relevanceScore(0.85 * ch.getConfidence())
                                .estimatedMinutes(30)
                                .build());
                    }
                }
            }
        }

        // 2. Extract keyphrase topics using TF-IDF / term frequency on paragraphs
        List<String> paragraphs = preprocessor.segmentParagraphs(fullText);
        Map<String, Integer> phraseFrequencies = new HashMap<>();

        for (String paragraph : paragraphs) {
            List<String> candidatePhrases = preprocessor.extractCandidateKeyphrases(paragraph);
            for (String phrase : candidatePhrases) {
                String norm = normalizeTopicName(phrase);
                if (isValidTopicName(norm)) {
                    phraseFrequencies.put(norm, phraseFrequencies.getOrDefault(norm, 0) + 1);
                }
            }
        }

        // Sort candidate phrases by frequency
        List<Map.Entry<String, Integer>> sortedPhrases = phraseFrequencies.entrySet().stream()
                .filter(e -> e.getValue() >= 2) // Mentioned at least twice
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(10)
                .collect(Collectors.toList());

        for (Map.Entry<String, Integer> entry : sortedPhrases) {
            String phrase = entry.getKey();
            if (seenTopicNames.add(phrase.toLowerCase())) {
                // Find matching chapter or assign default
                String matchingChapter = findBestMatchingChapter(phrase, chapters);
                topics.add(ExtractedTopic.builder()
                        .name(phrase)
                        .chapter(matchingChapter)
                        .keywords(extractTopKeywordsForText(phrase, 3))
                        .relevanceScore(Math.min(0.80, 0.40 + (entry.getValue() * 0.05)))
                        .estimatedMinutes(30)
                        .build());
            }
        }

        // Ensure at least 1-3 topics exist
        if (topics.isEmpty()) {
            List<String> topKeywords = extractTopKeywordsForText(fullText, 5);
            for (String kw : topKeywords) {
                topics.add(ExtractedTopic.builder()
                        .name(capitalizeWord(kw) + " Core Concepts")
                        .chapter("General Study")
                        .keywords(List.of(kw))
                        .relevanceScore(0.60)
                        .estimatedMinutes(30)
                        .build());
            }
        }

        return topics;
    }

    /**
     * Extract top keywords from text using frequency filtering.
     */
    public List<String> extractTopKeywordsForText(String text, int limit) {
        if (text == null || text.isBlank()) return Collections.emptyList();
        List<String> tokens = preprocessor.tokenizeAndFilterStopWords(text);
        Map<String, Integer> freqMap = new HashMap<>();

        for (String t : tokens) {
            if (t.length() >= 3) {
                freqMap.put(t, freqMap.getOrDefault(t, 0) + 1);
            }
        }

        return freqMap.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .map(Map.Entry::getKey)
                .map(this::capitalizeWord)
                .limit(limit)
                .collect(Collectors.toList());
    }

    private String findBestMatchingChapter(String phrase, List<ChapterDetector.ExtractedChapter> chapters) {
        if (chapters == null || chapters.isEmpty()) return "General";
        String lowerPhrase = phrase.toLowerCase();
        for (ChapterDetector.ExtractedChapter ch : chapters) {
            if (ch.getTitle() != null && ch.getTitle().toLowerCase().contains(lowerPhrase)) {
                return ch.getTitle();
            }
            if (ch.getContentSnippet() != null && ch.getContentSnippet().toLowerCase().contains(lowerPhrase)) {
                return ch.getTitle();
            }
        }
        return chapters.get(0).getTitle();
    }

    private String normalizeTopicName(String raw) {
        if (raw == null) return "";
        return raw.replaceAll("^[0-9\\.\\-\\s]+", "")
                  .replaceAll("[\\:\\-\\._]+$", "")
                  .replaceAll("\\s+", " ")
                  .trim();
    }

    private boolean isValidTopicName(String name) {
        if (name == null || name.length() < 3 || name.length() > 60) return false;
        String lower = name.toLowerCase();
        if (lower.equals("introduction") || lower.equals("summary") || lower.equals("conclusion") || lower.equals("overview")) {
            return false;
        }
        return !lower.matches("^[0-9\\s\\-_]+$");
    }

    private String capitalizeWord(String word) {
        if (word == null || word.isEmpty()) return "";
        return Character.toUpperCase(word.charAt(0)) + word.substring(1).toLowerCase();
    }
}

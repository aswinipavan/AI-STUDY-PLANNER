package com.aistudyplanner.service.nlp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Transparent, multi-signal complexity analyzer for academic materials and topics.
 * Evaluates technical term density, conceptual depth, student marks, and exam proximity.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DifficultyAnalyzer {

    private final NlpTextPreprocessor preprocessor;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DifficultyResult {
        private String level; // EASY, MEDIUM, HARD
        private int score;    // 0 to 100
        private String reason;
    }

    private static final Set<String> ADVANCED_CONCEPT_INDICATORS = new HashSet<>(Arrays.asList(
        "algorithm", "asymptotic", "recurrence", "optimization", "dynamic", "concurrency",
        "distributed", "synchronization", "deadlock", "differential", "integral", "matrix",
        "eigenvalue", "polynomial", "heuristic", "probabilistic", "quantum", "compiler",
        "automata", "turing", "np-complete", "cryptography", "backpropagation", "convolution",
        "regularization", "hyperparameter", "pipeline", "mutex", "semaphore", "kernel"
    ));

    private static final Set<String> INTRODUCTORY_INDICATORS = new HashSet<>(Arrays.asList(
        "introduction", "overview", "basics", "fundamentals", "definition", "history",
        "concepts", "terminology", "example", "summary", "principles", "introduction to"
    ));

    /**
     * Analyze overall difficulty for document text considering student marks and exam days.
     */
    public DifficultyResult analyzeDifficulty(String text, Double studentSubjectAvgScore, Integer daysToExam) {
        if (text == null || text.isBlank()) {
            return DifficultyResult.builder()
                    .level("MEDIUM")
                    .score(50)
                    .reason("Standard foundational concepts requiring balanced review.")
                    .build();
        }

        List<String> sentences = preprocessor.segmentSentences(text);
        List<String> tokens = preprocessor.tokenizeAndFilterStopWords(text);

        // Signal 1: Technical keyword & advanced indicator density
        int advancedTermCount = 0;
        int introTermCount = 0;
        for (String t : tokens) {
            String lower = t.toLowerCase();
            if (ADVANCED_CONCEPT_INDICATORS.contains(lower)) advancedTermCount++;
            if (INTRODUCTORY_INDICATORS.contains(lower)) introTermCount++;
        }

        double tokenCount = Math.max(1, tokens.size());
        double advancedDensity = (double) advancedTermCount / tokenCount;
        double introDensity = (double) introTermCount / tokenCount;

        // Signal 2: Sentence Length / Syntactic Complexity
        double avgSentenceWords = 0;
        if (!sentences.isEmpty()) {
            int totalWords = 0;
            for (String s : sentences) {
                totalWords += s.split("\\s+").length;
            }
            avgSentenceWords = (double) totalWords / sentences.size();
        }

        // Base score: 50 (neutral)
        double baseScore = 50.0;

        // Adjust for vocabulary and terminology
        baseScore += (advancedDensity * 250); // up to +25
        baseScore -= (introDensity * 150);    // down to -15

        // Adjust for sentence length complexity
        if (avgSentenceWords > 22) baseScore += 10;
        else if (avgSentenceWords < 12) baseScore -= 10;

        // Signal 3: Historical student performance in this subject
        List<String> reasons = new ArrayList<>();
        if (studentSubjectAvgScore != null) {
            if (studentSubjectAvgScore < 50.0) {
                baseScore += 15;
                reasons.add(String.format("Student average in this subject is low (%.1f%%)", studentSubjectAvgScore));
            } else if (studentSubjectAvgScore > 85.0) {
                baseScore -= 12;
                reasons.add(String.format("Student demonstrates strong mastery (%.1f%% average)", studentSubjectAvgScore));
            }
        }

        // Signal 4: Upcoming Exam Proximity
        if (daysToExam != null && daysToExam <= 7 && daysToExam >= 0) {
            baseScore += 10;
            reasons.add(String.format("Exam scheduled in %d days requires intensive preparation", daysToExam));
        }

        // Add terminology reason
        if (advancedTermCount > 2) {
            reasons.add("Contains advanced technical terms and multi-step concepts");
        } else if (introTermCount > 2) {
            reasons.add("Covers foundational and introductory definitions");
        } else {
            reasons.add("Structured academic content with standard concept depth");
        }

        // Clamp 10 to 95
        int finalScore = (int) Math.min(95, Math.max(10, Math.round(baseScore)));

        String level;
        if (finalScore < 40) {
            level = "EASY";
        } else if (finalScore < 70) {
            level = "MEDIUM";
        } else {
            level = "HARD";
        }

        String explanation = String.join("; ", reasons) + ".";

        return DifficultyResult.builder()
                .level(level)
                .score(finalScore)
                .reason(explanation)
                .build();
    }
}

package com.aistudyplanner.service.nlp;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Lightweight, pure-Java NLP Preprocessor for academic documents.
 * Performs normalization, sentence tokenization, stop-word removal, and paragraph segmentation.
 */
@Component
@Slf4j
public class NlpTextPreprocessor {

    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
        "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
        "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
        "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
        "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers",
        "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in",
        "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
        "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
        "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's",
        "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs",
        "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
        "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't",
        "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
        "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't",
        "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
        "yourselves", "page", "chapter", "unit", "module", "lecture", "student", "copyright", "all", "rights",
        "reserved", "download", "author", "edition", "published", "university", "department", "index",
        "table", "contents", "figure", "table", "summary", "notes", "questions", "answers", "review"
    ));

    private static final Pattern SENTENCE_SPLIT_PATTERN = Pattern.compile("(?<=[.!?])\\s+(?=[A-Z0-9])");
    private static final Pattern CLEAN_WORD_PATTERN = Pattern.compile("[^a-zA-Z0-9\\-_]");

    /**
     * Clean and normalize raw text.
     */
    public String normalize(String text) {
        if (text == null) return "";
        return text.replace("\r\n", "\n")
                   .replace("\r", "\n")
                   .replaceAll("[\\t\\f ]+", " ")
                   .replaceAll("\n{3,}", "\n\n")
                   .trim();
    }

    /**
     * Segment text into individual sentences.
     */
    public List<String> segmentSentences(String text) {
        if (text == null || text.isBlank()) return Collections.emptyList();
        String normalized = normalize(text);
        String[] rawSentences = SENTENCE_SPLIT_PATTERN.split(normalized);
        List<String> sentences = new ArrayList<>();
        for (String s : rawSentences) {
            String trimmed = s.trim();
            if (trimmed.length() > 5) {
                sentences.add(trimmed);
            }
        }
        return sentences;
    }

    /**
     * Segment text into paragraphs.
     */
    public List<String> segmentParagraphs(String text) {
        if (text == null || text.isBlank()) return Collections.emptyList();
        String normalized = normalize(text);
        String[] parts = normalized.split("\n\n+");
        List<String> paragraphs = new ArrayList<>();
        for (String p : parts) {
            String trimmed = p.trim();
            if (!trimmed.isEmpty()) {
                paragraphs.add(trimmed);
            }
        }
        return paragraphs;
    }

    /**
     * Tokenize text into non-stop lowercase words.
     */
    public List<String> tokenizeAndFilterStopWords(String text) {
        if (text == null || text.isBlank()) return Collections.emptyList();
        String[] words = text.toLowerCase().split("[^a-zA-Z0-9\\-_]+");
        List<String> tokens = new ArrayList<>();
        for (String w : words) {
            String clean = CLEAN_WORD_PATTERN.matcher(w).replaceAll("").trim();
            if (clean.length() >= 3 && !STOP_WORDS.contains(clean) && !isNumeric(clean)) {
                tokens.add(clean);
            }
        }
        return tokens;
    }

    /**
     * Extract 2-gram and 3-gram keyphrases from text.
     */
    public List<String> extractCandidateKeyphrases(String text) {
        if (text == null || text.isBlank()) return Collections.emptyList();
        List<String> sentences = segmentSentences(text);
        List<String> phrases = new ArrayList<>();

        for (String sentence : sentences) {
            String[] words = sentence.split("[^a-zA-Z0-9\\-_]+");
            List<String> cleanedWords = Arrays.stream(words)
                    .map(w -> CLEAN_WORD_PATTERN.matcher(w).replaceAll("").trim())
                    .filter(w -> !w.isEmpty())
                    .collect(Collectors.toList());

            // 2-grams
            for (int i = 0; i < cleanedWords.size() - 1; i++) {
                String w1 = cleanedWords.get(i);
                String w2 = cleanedWords.get(i + 1);
                if (isValidPhraseWord(w1) && isValidPhraseWord(w2)) {
                    phrases.add(capitalizePhrase(w1 + " " + w2));
                }
            }

            // 3-grams
            for (int i = 0; i < cleanedWords.size() - 2; i++) {
                String w1 = cleanedWords.get(i);
                String w2 = cleanedWords.get(i + 1);
                String w3 = cleanedWords.get(i + 2);
                if (isValidPhraseWord(w1) && isValidPhraseWord(w3) && (isValidPhraseWord(w2) || STOP_WORDS.contains(w2.toLowerCase()))) {
                    phrases.add(capitalizePhrase(w1 + " " + w2 + " " + w3));
                }
            }
        }
        return phrases;
    }

    private boolean isValidPhraseWord(String word) {
        String lower = word.toLowerCase();
        return word.length() >= 3 && !STOP_WORDS.contains(lower) && !isNumeric(word);
    }

    private boolean isNumeric(String str) {
        return str.matches("\\d+");
    }

    private String capitalizePhrase(String phrase) {
        String[] parts = phrase.split(" ");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i];
            if (p.isEmpty()) continue;
            if (i > 0 && STOP_WORDS.contains(p.toLowerCase())) {
                sb.append(p.toLowerCase());
            } else {
                sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1).toLowerCase());
            }
            if (i < parts.length - 1) sb.append(" ");
        }
        return sb.toString();
    }
}

package com.aistudyplanner.util;

public class AiPromptBuilder {

    public static String buildTopicSuggestionPrompt(String subjectName, double avgPercentage, int durationMinutes, int daysToExam) {
        return String.format("For student studying %s with %.2f%% average, " +
                "suggest a specific study topic for today's %d minute session. " +
                "Be concise (max 10 words). Exam in %d days.",
                subjectName, avgPercentage, durationMinutes, daysToExam);
    }
}

package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.response.ExamResponse;
import com.aistudyplanner.model.entity.ChatHistory;
import com.aistudyplanner.service.ai.AiRequest;
import com.aistudyplanner.service.ai.AiProviderGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Builds every AI prompt the application sends, and nothing else.
 *
 * <p>This class used to own the Groq HTTP transport as well. That half now lives in
 * {@link com.aistudyplanner.service.ai.provider.GroqProvider}, behind
 * {@link AiProviderGateway}, so the same prompts are served by AgentRouter (Claude) first and Groq
 * only as a fallback. Every method signature, every prompt string and every truncation limit below is
 * unchanged, which is why all seven call sites — {@code AiAssistantService}, {@code ExamService},
 * {@code MaterialService}, {@code DocumentIntelligenceService}, {@code StudyRoomService},
 * {@code TimetableService}, {@code PerformanceService} — plus both AI controllers, the web frontend and
 * the mobile app needed no change at all.
 *
 * <p>The name is kept for the same reason: renaming it would churn nine files without changing
 * behaviour. Read it as "the AI prompt layer", not "the Groq client".
 *
 * <p>Student context assembly stays deliberately centralised — the prompt methods here, and the richer
 * document/academic context builders in {@code AiAssistantService} — so both providers receive
 * byte-identical context and the choice of provider can never change what the model was told.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GroqService {

    private final AiProviderGateway aiProviderGateway;

    /**
     * Sends a prompt through the provider chain and returns the text.
     *
     * <p>{@code purpose} is a short, non-sensitive feature label that appears in provider logs so an
     * operator can see which feature a call came from without the prompt itself ever being logged.
     */
    private String generate(String prompt, String purpose) {
        return aiProviderGateway.complete(AiRequest.of(prompt, purpose)).text();
    }

    public String analyzeMarks(UUID studentId, Map<String, Double> subjectAverages) {
        String prompt = String.format("You are an academic advisor AI. A student has these subject scores: %s. " +
                "Analyze their performance and provide: " +
                "1. Overall assessment (2 sentences) " +
                "2. Top 3 subjects needing immediate attention with specific improvement strategies " +
                "3. Study time recommendation per weak subject per day " +
                "4. One motivational insight " +
                "Keep response under 300 words. Be direct and actionable.", subjectAverages);
        return generate(prompt, "analyze-marks");
    }

    public String chat(String userMessage, List<ChatHistory> history) {
        return chat(userMessage, history, null);
    }

    public String chat(String userMessage, List<ChatHistory> history, String documentContext) {
        // Redact any sensitive tokens or credentials from the user input
        String sanitizedUserMessage = com.aistudyplanner.util.AiErrorSanitizer.redactSensitiveData(userMessage);

        // Limit context window to avoid exceeding provider token limits
        // Estimate: ~4 tokens per word, max 2000 tokens for context = ~500 words
        final int MAX_CONTEXT_WORDS = 500;

        StringBuilder historyBuilder = new StringBuilder();
        int wordCount = 0;

        // Build context from most recent messages backwards
        for (int i = history.size() - 1; i >= 0 && wordCount < MAX_CONTEXT_WORDS; i--) {
            ChatHistory h = history.get(i);
            String entry = h.getRole() + ": " + h.getMessage() + "\n";
            int entryWords = h.getMessage().split("\\s+").length;

            if (wordCount + entryWords <= MAX_CONTEXT_WORDS) {
                historyBuilder.insert(0, entry);
                wordCount += entryWords;
            }
        }

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("You are an expert AI Academic Tutor and pedagogical specialist helping a student master their curriculum.\n\n");
        promptBuilder.append("Teaching guidelines:\n");
        promptBuilder.append("1. Tone: Encouraging, direct, academic. No meta-commentary (never say 'Here is your answer' or 'As an AI model'). Start directly with the answer.\n");
        promptBuilder.append("2. Structure: Clear 1-2 sentence core intuition, ## Key Concept, ### Worked Example, ### Step-by-Step Method (numbered 1. 2. 3.), ### Why It Matters, and > **Important:** callouts.\n");
        promptBuilder.append("3. Scaling: Concise for simple definitions; step-by-step for derivations; structured bullet points for summaries.\n");
        promptBuilder.append("4. Formatting: Standard GFM tables for comparisons (no raw ASCII pipes); LaTeX math ($inline$, $$block$$); fenced code blocks with language tags.\n\n");

        promptBuilder.append("Technical Error & Diagnostic Analysis Protocol:\n");
        promptBuilder.append("When the student provides technical errors, browser console logs, network requests/responses, stack traces, GitHub Actions failures, SQL errors, JSON API errors, or screenshots:\n");
        promptBuilder.append("- DO NOT dump or echo raw noisy debug data (headers, cookies, User-Agents, request metadata, multi-page stack traces).\n");
        promptBuilder.append("- Extract the essential evidence (HTTP status, endpoint, root exception 'Caused by', failing line, or failing step).\n");
        promptBuilder.append("- Structure your response with these exact markdown sections:\n");
        promptBuilder.append("  ## What happened\n  (1-2 clear sentences explaining the failure in student-friendly terms)\n");
        promptBuilder.append("  ## Root cause\n  (The primary technical or logic cause, clearly identified)\n");
        promptBuilder.append("  ## What to do\n  (Actionable, proportional, step-by-step instructions to fix the issue; never recommend deleting databases or disabling security)\n");
        promptBuilder.append("  ## Verify\n  (Concrete test command, curl request, or action to confirm the fix)\n");
        promptBuilder.append("- Clearly distinguish confirmed facts (e.g. 'Confirmed: The server returned HTTP 400 with message...') from inferences (e.g. 'Likely: This indicates a uniqueness validation rejection', 'Possible: ...'). Never state an inference as a confirmed fact.\n");
        promptBuilder.append("- Security & Privacy: Never expose or echo sensitive credentials, tokens, cookies, Authorization headers, or JWTs. Redact any sensitive tokens with `[redacted]`.\n");
        promptBuilder.append("- Academic & Code Errors: Apply the same structured problem analysis (What happened, Root cause, What to do, Verify) for compiler errors, syntax bugs, or mathematical reasoning mistakes.\n\n");

        if (documentContext != null && !documentContext.isBlank()) {
            promptBuilder.append("--- RELEVANT ACADEMIC MATERIAL / DOCUMENT CONTEXT ---\n");
            promptBuilder.append(documentContext).append("\n");
            promptBuilder.append("--- END ACADEMIC MATERIAL CONTEXT ---\n\n");
            promptBuilder.append("Use the academic material context above directly to ground your answer.\n");
            promptBuilder.append("Prioritize syllabus topics and terminology from the student's uploaded notes. If not found in material, note that and provide a general explanation.\n\n");
        }

        if (historyBuilder.length() > 0) {
            promptBuilder.append("Previous conversation:\n").append(historyBuilder).append("\n");
        }

        promptBuilder.append("Student: ").append(sanitizedUserMessage);

        return generate(promptBuilder.toString(), "chat");
    }

    public String generateTopicSuggestion(String subjectName, double avgPercentage, int durationMinutes, int daysToExam) {
        String prompt = String.format("For student studying %s with %.2f%% average, " +
                "suggest a specific study topic for today's %d minute session. " +
                "Be concise (max 10 words). Exam in %d days.", subjectName, avgPercentage, durationMinutes, daysToExam);
        return generate(prompt, "topic-suggestion");
    }

    public String summarizeMaterial(String textContent) {
        if (textContent.length() > 10000) {
            textContent = textContent.substring(0, 10000);
        }
        String prompt = "Summarize this study material in 5 bullet points (max 150 words total): " + textContent;
        return generate(prompt, "summarize-material");
    }

    public String categorizeMaterial(String fileName, String textPreview) {
        if (textPreview.length() > 2000) {
            textPreview = textPreview.substring(0, 2000);
        }
        String prompt = String.format("Based on this file name and content preview, identify the college subject name " +
                "(e.g., 'Data Structures', 'Engineering Mathematics'). Reply with only the subject name, nothing else. " +
                "File: %s. Preview: %s", fileName, textPreview);
        return generate(prompt, "categorize-material").trim();
    }

    public String extractTopicFromMaterials(String subjectName, double avgPercentage, int durationMinutes, String materialSummaries) {
        if (materialSummaries.length() > 3000) {
            materialSummaries = materialSummaries.substring(0, 3000) + "...";
        }
        String prompt = String.format(
            "Based on these uploaded study materials for %s, suggest ONE specific topic/chapter for a %d minute study session. " +
            "Student's average: %.2f%%. Pick topics from the materials below. Be concise (max 10 words).\n\n%s",
            subjectName, durationMinutes, avgPercentage, materialSummaries
        );
        return generate(prompt, "extract-topic").trim();
    }

    public String generateExamPlan(String studentName, List<ExamResponse> exams, Map<String, Double> subjectAverages) {
        String prompt = String.format("Create a day-by-day exam preparation plan for %s.\n" +
                "Upcoming exams: %s\n" +
                "Subject averages: %s\n" +
                "Provide a structured plan with: daily goals, priority topics, revision strategy.\n" +
                "Keep it under 400 words.", studentName, exams, subjectAverages);
        return generate(prompt, "exam-plan");
    }

    @Cacheable(value = "groq-tips", key = "#date")
    public String getMotivationalTip(String date) {
        String prompt = "Give one unique motivational tip for a college student studying for exams. Max 2 sentences.";
        return generate(prompt, "motivation");
    }
}

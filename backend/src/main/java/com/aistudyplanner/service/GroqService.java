package com.aistudyplanner.service;

import com.aistudyplanner.config.GroqConfig;
import com.aistudyplanner.exception.GroqApiException;
import com.aistudyplanner.exception.RateLimitException;
import com.aistudyplanner.model.dto.response.ExamResponse;
import com.aistudyplanner.model.entity.ChatHistory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroqService {

    private final RestTemplate groqRestTemplate;
    private final ObjectMapper objectMapper;

    @Value("${groq.api-key}")
    private String apiKey;

    @Value("${groq.model:openai/gpt-oss-20b}")
    private String model;

    private final ConcurrentHashMap<Long, AtomicInteger> rateLimiter = new ConcurrentHashMap<>();

    private void checkRateLimit() {
        long currentMinute = Instant.now().getEpochSecond() / 60;
        rateLimiter.putIfAbsent(currentMinute, new AtomicInteger(0));
        
        if (rateLimiter.get(currentMinute).incrementAndGet() > com.aistudyplanner.util.Constants.GROQ_RATE_LIMIT_PER_MINUTE) {
            throw new RateLimitException("Groq API rate limit exceeded (" + com.aistudyplanner.util.Constants.GROQ_RATE_LIMIT_PER_MINUTE + " requests per minute).");
        }
        
        rateLimiter.keySet().removeIf(minute -> minute < currentMinute - 1);
    }

    private String callGroq(String prompt) {
        return callGroq(prompt, true);
    }

    private String callGroq(String prompt, boolean allowRetry) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new GroqApiException("Groq is not configured on the backend.", null);
        }
        checkRateLimit();
        long startTime = System.currentTimeMillis();
        try {
            Map<String, Object> body = new HashMap<>();
            
            // Groq uses OpenAI-compatible API format
            body.put("model", model != null && !model.isBlank() ? model : "openai/gpt-oss-20b");
            
            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);
            
            body.put("messages", List.of(message));
            body.put("temperature", 0.7);
            body.put("max_tokens", 1000);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            String responseStr = groqRestTemplate.postForObject(GroqConfig.GROQ_API_URL, request, String.class);
            if (responseStr == null || responseStr.isBlank()) {
                throw new GroqApiException("Groq returned an empty response.", null);
            }
            
            long duration = System.currentTimeMillis() - startTime;
            log.debug("Groq API call successful. Duration: {}ms", duration);
            
            JsonNode root = objectMapper.readTree(responseStr);
            if (root.has("choices") && root.path("choices").size() > 0) {
                String content = root.path("choices").get(0).path("message").path("content").asText();
                if (!content.isBlank()) return cleanResponse(content);
            }
            if (root.has("candidates") && root.path("candidates").size() > 0) {
                String content = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
                if (!content.isBlank()) return cleanResponse(content);
            }
            throw new GroqApiException("Groq returned a malformed response.", null);

        } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
            if (allowRetry) {
                log.warn("Groq rate limit encountered. Waiting 2.5s and retrying once...");
                try {
                    Thread.sleep(2500);
                    return callGroq(prompt, false);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
            throw new RateLimitException("Groq API rate limit exceeded. Please try again shortly.");
        } catch (GroqApiException | RateLimitException e) {
            throw e;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.warn("Groq API call failed after {}ms. Prompt length: {}. Error type: {}",
                    duration, prompt.length(), e.getClass().getSimpleName());
            throw new GroqApiException("Groq request failed.", e);
        }
    }

    private String cleanResponse(String content) {
        if (content == null) return "";
        String cleaned = content.replaceAll("(?s)<think>.*?</think>", "").trim();
        return cleaned.isBlank() ? content.trim() : cleaned;
    }

    public String analyzeMarks(UUID studentId, Map<String, Double> subjectAverages) {
        String prompt = String.format("You are an academic advisor AI. A student has these subject scores: %s. " +
                "Analyze their performance and provide: " +
                "1. Overall assessment (2 sentences) " +
                "2. Top 3 subjects needing immediate attention with specific improvement strategies " +
                "3. Study time recommendation per weak subject per day " +
                "4. One motivational insight " +
                "Keep response under 300 words. Be direct and actionable.", subjectAverages);
        return callGroq(prompt);
    }

    public String chat(String userMessage, List<ChatHistory> history) {
        return chat(userMessage, history, null);
    }

    public String chat(String userMessage, List<ChatHistory> history, String documentContext) {
        // Limit context window to avoid exceeding Groq token limits
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
        promptBuilder.append("You are an AI study assistant and an expert academic problem solver helping a college student.\n");
        promptBuilder.append("When presented with problems, concepts, or academic questions, analyze them step-by-step, explain underlying ideas clearly, and provide accurate, student-friendly explanations.\n\n");
        
        if (documentContext != null && !documentContext.isBlank()) {
            promptBuilder.append("--- RELEVANT ACADEMIC MATERIAL / DOCUMENT CONTEXT ---\n");
            promptBuilder.append(documentContext).append("\n");
            promptBuilder.append("--- END DOCUMENT CONTEXT ---\n\n");
            promptBuilder.append("Instruction: Use the academic material context above directly to answer the student's question accurately.\n\n");
        }

        if (historyBuilder.length() > 0) {
            promptBuilder.append("Previous conversation:\n").append(historyBuilder).append("\n");
        }

        promptBuilder.append("Student's question: ").append(userMessage);
        
        return callGroq(promptBuilder.toString());
    }

    public String generateTopicSuggestion(String subjectName, double avgPercentage, int durationMinutes, int daysToExam) {
        String prompt = String.format("For student studying %s with %.2f%% average, " +
                "suggest a specific study topic for today's %d minute session. " +
                "Be concise (max 10 words). Exam in %d days.", subjectName, avgPercentage, durationMinutes, daysToExam);
        return callGroq(prompt);
    }

    public String summarizeMaterial(String textContent) {
        if (textContent.length() > 10000) {
            textContent = textContent.substring(0, 10000);
        }
        String prompt = "Summarize this study material in 5 bullet points (max 150 words total): " + textContent;
        return callGroq(prompt);
    }

    public String categorizeMaterial(String fileName, String textPreview) {
        if (textPreview.length() > 2000) {
            textPreview = textPreview.substring(0, 2000);
        }
        String prompt = String.format("Based on this file name and content preview, identify the college subject name " +
                "(e.g., 'Data Structures', 'Engineering Mathematics'). Reply with only the subject name, nothing else. " +
                "File: %s. Preview: %s", fileName, textPreview);
        return callGroq(prompt).trim();
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
        return callGroq(prompt).trim();
    }

    public String generateExamPlan(String studentName, List<ExamResponse> exams, Map<String, Double> subjectAverages) {
        String prompt = String.format("Create a day-by-day exam preparation plan for %s.\n" +
                "Upcoming exams: %s\n" +
                "Subject averages: %s\n" +
                "Provide a structured plan with: daily goals, priority topics, revision strategy.\n" +
                "Keep it under 400 words.", studentName, exams, subjectAverages);
        return callGroq(prompt);
    }

    @Cacheable(value = "groq-tips", key = "#date")
    public String getMotivationalTip(String date) {
        String prompt = "Give one unique motivational tip for a college student studying for exams. Max 2 sentences.";
        return callGroq(prompt);
    }
}

package com.aistudyplanner.service;

import com.aistudyplanner.config.GroqConfig;
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
        checkRateLimit();
        long startTime = System.currentTimeMillis();
        try {
            Map<String, Object> body = new HashMap<>();
            
            Map<String, Object> part = new HashMap<>();
            part.put("text", prompt);
            
            Map<String, Object> content = new HashMap<>();
            content.put("role", "user");
            content.put("parts", List.of(part));
            
            body.put("contents", List.of(content));
            
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("temperature", 0.7);
            generationConfig.put("maxOutputTokens", 1000);
            body.put("generationConfig", generationConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            String url = GroqConfig.GROQ_API_URL + "?key=" + apiKey;

            String responseStr = groqRestTemplate.postForObject(url, request, String.class);
            
            long duration = System.currentTimeMillis() - startTime;
            log.debug("Groq API call successful. Duration: {}ms", duration);
            
            JsonNode root = objectMapper.readTree(responseStr);
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Groq API call failed after {}ms. Prompt length: {}. Error: {}", 
                duration, prompt.length(), e.getMessage(), e);
            return "I'm currently unable to generate a response. Please try again later.";
        }
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
        
        String prompt = String.format("You are an AI study assistant helping a college student. " +
                "You help with academic doubts, explain concepts, suggest study strategies, " +
                "and provide motivation. Keep answers concise and student-friendly.\n" +
                "Previous conversation:\n%s\n" +
                "Student's question: %s", historyBuilder.toString(), userMessage);
        
        return callGroq(prompt);
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

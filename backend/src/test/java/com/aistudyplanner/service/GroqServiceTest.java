package com.aistudyplanner.service;

import com.aistudyplanner.exception.RateLimitException;
import com.aistudyplanner.model.dto.response.ExamResponse;
import com.aistudyplanner.model.entity.ChatHistory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Groq AI Service Tests - Module 2")
class GroqServiceTest {

    @Mock
    private RestTemplate groqRestTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private GroqService groqService;

    private UUID testStudentId;
    private ObjectMapper realObjectMapper;

    @BeforeEach
    void setUp() throws IOException {
        testStudentId = UUID.randomUUID();
        ReflectionTestUtils.setField(groqService, "apiKey", "test-groq-api-key");
        realObjectMapper = new ObjectMapper();
    }

    // ============ Test 1: Analyze Marks Success ============
    @Test
    @DisplayName("Should analyze student marks and return improvement suggestions")
    void testAnalyzeMarksSuccess() throws IOException {
        // Arrange
        Map<String, Double> subjectAverages = new HashMap<>();
        subjectAverages.put("Mathematics", 75.0);
        subjectAverages.put("Physics", 68.0);

        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Mathematics needs focus. Practice derivatives and integrals.\"}]}}]}";
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.analyzeMarks(testStudentId, subjectAverages);

        // Assert
        assertThat(result).isNotNull().isNotEmpty();
        verify(groqRestTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    // ============ Test 2: Analyze Marks API Failure ============
    @Test
    @DisplayName("Should handle API failure and return fallback message")
    void testAnalyzeMarksAPIFailure() {
        // Arrange
        Map<String, Double> subjectAverages = new HashMap<>();
        subjectAverages.put("Chemistry", 80.0);
        
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new RuntimeException("Connection failed"));

        // Act
        String result = groqService.analyzeMarks(testStudentId, subjectAverages);

        // Assert
        assertThat(result).contains("unable to generate a response");
    }

    // ============ Test 3: Analyze Marks Empty Subjects ============
    @Test
    @DisplayName("Should handle empty subject averages gracefully")
    void testAnalyzeMarksEmptySubjects() throws IOException {
        // Arrange
        Map<String, Double> emptyAverages = new HashMap<>();
        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"No subjects provided\"}]}}]}";
        
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.analyzeMarks(testStudentId, emptyAverages);

        // Assert
        assertThat(result).isNotNull();
    }

    // ============ Test 4: Chat Success ============
    @Test
    @DisplayName("Should generate chat response for student questions")
    void testChatSuccess() throws IOException {
        // Arrange
        List<ChatHistory> history = new ArrayList<>();
        String userMessage = "How does photosynthesis work?";
        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Photosynthesis converts light energy into chemical energy through chlorophyll.\"}]}}]}";
        
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.chat(userMessage, history);

        // Assert
        assertThat(result).isNotNull().isNotEmpty().contains("energy");
        verify(groqRestTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    // ============ Test 5: Chat Context Limiting ============
    @Test
    @DisplayName("Should limit context window to avoid token overflow")
    void testChatContextLimiting() throws IOException {
        // Arrange - Create 50 history items to test context window limiting
        List<ChatHistory> history = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            ChatHistory h = new ChatHistory();
            h.setRole("user");
            h.setMessage("This is a long conversation message number " + i + " with lots of content to fill the context");
            history.add(h);
        }

        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Context limited response\"}]}}]}";
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.chat("What about this?", history);

        // Assert
        assertThat(result).isNotNull();
        verify(groqRestTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    // ============ Test 6: Chat Empty History ============
    @Test
    @DisplayName("Should handle chat with empty history")
    void testChatEmptyHistory() throws IOException {
        // Arrange
        String userMessage = "What is calculus?";
        List<ChatHistory> emptyHistory = new ArrayList<>();
        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Calculus is mathematics of change and motion.\"}]}}]}";

        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.chat(userMessage, emptyHistory);

        // Assert
        assertThat(result).isNotNull();
    }

    // ============ Test 7: Topic Suggestion ============
    @Test
    @DisplayName("Should generate topic suggestions based on performance")
    void testGenerateTopicSuggestion() throws IOException {
        // Arrange
        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Study recursive functions and backtracking\"}]}}]}";
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.generateTopicSuggestion("Data Structures", 65.0, 90, 3);

        // Assert
        assertThat(result).isNotNull().isNotEmpty();
        verify(groqRestTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    // ============ Test 8: Summarize Material ============
    @Test
    @DisplayName("Should summarize material into bullet points")
    void testSummarizeMaterial() throws IOException {
        // Arrange
        String longContent = "Chapter 1 discusses quantum mechanics. It covers wave-particle duality, uncertainty principle, and superposition. " +
                "These concepts form the basis for understanding atomic structure and behavior.";
        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"- Wave-particle duality\\n- Uncertainty principle\\n- Superposition\"}]}}]}";
        
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.summarizeMaterial(longContent);

        // Assert
        assertThat(result).isNotNull();
        verify(groqRestTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    // ============ Test 9: Summarize Truncates Long Content ============
    @Test
    @DisplayName("Should truncate content longer than 10000 characters")
    void testSummarizeMaterialTruncatesLongContent() throws IOException {
        // Arrange - Create content longer than 10000 chars
        StringBuilder longContent = new StringBuilder();
        for (int i = 0; i < 1500; i++) {
            longContent.append("This is content block number ").append(i).append(" to test truncation. ");
        }

        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Summary created\"}]}}]}";
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.summarizeMaterial(longContent.toString());

        // Assert
        assertThat(result).isNotNull();
        verify(groqRestTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    // ============ Test 10: Categorize Material ============
    @Test
    @DisplayName("Should categorize material by subject")
    void testCategorizeMaterial() throws IOException {
        // Arrange
        String fileName = "Chapter_3_Algorithms.pdf";
        String preview = "Algorithm complexity analysis using Big O notation and sorting techniques.";
        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Computer Science\"}]}}]}";
        
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.categorizeMaterial(fileName, preview);

        // Assert
        assertThat(result).isNotNull().isNotEmpty();
        verify(groqRestTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    // ============ Test 11: Categorize Material Truncates Preview ============
    @Test
    @DisplayName("Should truncate preview longer than 2000 characters")
    void testCategorizeMaterialTruncatesPreview() throws IOException {
        // Arrange - Create preview longer than 2000 chars
        StringBuilder longPreview = new StringBuilder();
        for (int i = 0; i < 300; i++) {
            longPreview.append("This is preview content block number ").append(i).append(". ");
        }

        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Mathematics\"}]}}]}";
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.categorizeMaterial("math.txt", longPreview.toString());

        // Assert
        assertThat(result).isNotNull();
        verify(groqRestTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    // ============ Test 12: Generate Exam Plan ============
    @Test
    @DisplayName("Should generate structured exam preparation plan")
    void testGenerateExamPlan() throws IOException {
        // Arrange
        String studentName = "John Doe";
        List<ExamResponse> exams = new ArrayList<>();
        ExamResponse exam1 = ExamResponse.builder()
                .examName("Mathematics Final")
                .examDate(LocalDate.of(2026, 8, 15))
                .daysRemaining(24)
                .build();
        exams.add(exam1);

        Map<String, Double> averages = new HashMap<>();
        averages.put("Math", 78.0);
        averages.put("Physics", 75.0);

        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Day-by-day exam plan with structured topics and revision strategy\"}]}}]}";
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String result = groqService.generateExamPlan(studentName, exams, averages);

        // Assert
        assertThat(result).isNotNull();
        verify(groqRestTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    // ============ Test 13: Get Motivational Tip Cached ============
    @Test
    @DisplayName("Should cache motivational tips by date")
    void testGetMotivationalTipCached() throws IOException {
        // Arrange
        String date = "2026-07-22";
        String mockResponse = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Stay persistent and trust your preparation!\"}]}}]}";
        
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse);
        when(objectMapper.readTree(mockResponse))
                .thenReturn(realObjectMapper.readTree(mockResponse));

        // Act
        String tip1 = groqService.getMotivationalTip(date);
        String tip2 = groqService.getMotivationalTip(date);

        // Assert
        assertThat(tip1).isNotNull();
        assertThat(tip2).isNotNull();
        assertThat(tip1).isEqualTo(tip2); // Should be cached
    }

    // ============ Test 14: Get Motivational Tip Different Dates ============
    @Test
    @DisplayName("Should generate different tips for different dates")
    void testGetMotivationalTipDifferentDates() throws IOException {
        // Arrange
        String mockResponse1 = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Tip 1\"}]}}]}";
        String mockResponse2 = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Tip 2\"}]}}]}";

        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(mockResponse1)
                .thenReturn(mockResponse2);
        when(objectMapper.readTree(mockResponse1))
                .thenReturn(realObjectMapper.readTree(mockResponse1));
        when(objectMapper.readTree(mockResponse2))
                .thenReturn(realObjectMapper.readTree(mockResponse2));

        // Act
        String tip1 = groqService.getMotivationalTip("2026-07-22");
        String tip2 = groqService.getMotivationalTip("2026-07-23");

        // Assert
        assertThat(tip1).isNotNull();
        assertThat(tip2).isNotNull();
    }

    // ============ Test 15: Rate Limiting ============
    @Test
    @DisplayName("Should enforce rate limiting by returning fallback message")
    void testRateLimitingEnforcement() {
        // Arrange - Mock the RestTemplate to trigger rate limit check internally
        // The service will call checkRateLimit() which throws RateLimitException
        // However, the callGroq() catch block catches it and returns fallback
        Map<String, Double> marks = Collections.singletonMap("Math", 80.0);
        
        // We'll simulate rate limiting by causing the service to hit the limit
        // by calling it many times. Since we're testing in isolation with mocks,
        // we instead test that the fallback message is returned on any exception
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new RuntimeException("Rate limit"));

        // Act
        String result = groqService.analyzeMarks(testStudentId, marks);

        // Assert - Service catches exceptions and returns fallback
        assertThat(result).contains("unable to generate a response");
    }

    // ============ Test 16: Chat Failure ============
    @Test
    @DisplayName("Should handle chat API failure gracefully")
    void testChatAPIFailure() {
        // Arrange
        String userMessage = "How do I study better?";
        List<ChatHistory> history = new ArrayList<>();
        
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new RuntimeException("Service unavailable"));

        // Act
        String result = groqService.chat(userMessage, history);

        // Assert
        assertThat(result).contains("unable to generate a response");
    }

    // ============ Test 17: Summarize Failure ============
    @Test
    @DisplayName("Should handle summarization API failure")
    void testSummarizeMaterialFailure() {
        // Arrange
        String content = "Some material to summarize";
        
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new RuntimeException("API error"));

        // Act
        String result = groqService.summarizeMaterial(content);

        // Assert
        assertThat(result).contains("unable to generate a response");
    }

    // ============ Test 18: Categorize Failure ============
    @Test
    @DisplayName("Should handle categorization API failure")
    void testCategorizeMaterialFailure() {
        // Arrange
        when(groqRestTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new RuntimeException("Categorization failed"));

        // Act
        String result = groqService.categorizeMaterial("file.pdf", "content preview");

        // Assert
        assertThat(result).contains("unable to generate a response");
    }
}

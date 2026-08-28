package com.aistudyplanner.service;

import com.aistudyplanner.exception.AiProviderException;
import com.aistudyplanner.exception.RateLimitException;
import com.aistudyplanner.model.dto.response.ExamResponse;
import com.aistudyplanner.model.entity.ChatHistory;
import com.aistudyplanner.service.ai.AiCompletion;
import com.aistudyplanner.service.ai.AiProviderGateway;
import com.aistudyplanner.service.ai.AiRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Prompt-layer behaviour of {@link GroqService}, now that the HTTP transport lives in the provider
 * package.
 *
 * <p>The provider gateway is mocked, so what these tests pin down is the part that must be identical
 * for both providers: the prompt text, the truncation limits, the chat context window, and the fact
 * that every feature reaches AI through the one gateway. Transport-level behaviour moved to
 * {@code AgentRouterProviderTest} and {@code GroqProviderTest}.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AI prompt service — prompts, limits and context (provider-agnostic)")
class GroqServiceTest {

    @Mock
    private AiProviderGateway aiProviderGateway;

    @InjectMocks
    private GroqService groqService;

    private UUID testStudentId;

    @BeforeEach
    void setUp() {
        testStudentId = UUID.randomUUID();
    }

    private void aiReturns(String text) {
        when(aiProviderGateway.complete(any()))
                .thenReturn(new AiCompletion(text, "AgentRouter", "claude-opus-5", 30L));
    }

    private AiRequest capturedRequest() {
        ArgumentCaptor<AiRequest> captor = ArgumentCaptor.forClass(AiRequest.class);
        verify(aiProviderGateway).complete(captor.capture());
        return captor.getValue();
    }

    // ── Performance analysis ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Should analyze student marks and return improvement suggestions")
    void testAnalyzeMarksSuccess() {
        Map<String, Double> subjectAverages = new HashMap<>();
        subjectAverages.put("Mathematics", 75.0);
        subjectAverages.put("Physics", 68.0);
        aiReturns("Mathematics needs focus. Practice derivatives and integrals.");

        String result = groqService.analyzeMarks(testStudentId, subjectAverages);

        assertThat(result).isNotNull().isNotEmpty();
        verify(aiProviderGateway, times(1)).complete(any());

        AiRequest request = capturedRequest();
        assertThat(request.purpose()).isEqualTo("analyze-marks");
        // The marks themselves must reach the provider, not a summary of them.
        assertThat(request.prompt()).contains("Mathematics", "Physics", "75.0", "68.0");
    }

    @Test
    @DisplayName("Should surface AI failures instead of inventing an AI response")
    void testAnalyzeMarksAiFailure() {
        Map<String, Double> subjectAverages = Collections.singletonMap("Chemistry", 80.0);
        when(aiProviderGateway.complete(any()))
                .thenThrow(new AiProviderException("AI service temporarily unavailable"));

        assertThatThrownBy(() -> groqService.analyzeMarks(testStudentId, subjectAverages))
                .isInstanceOf(AiProviderException.class);
    }

    @Test
    @DisplayName("Should propagate a rate-limited chain as a rate-limit error, not a generic outage")
    void testRateLimitPropagates() {
        Map<String, Double> marks = Collections.singletonMap("Math", 80.0);
        when(aiProviderGateway.complete(any())).thenThrow(new RateLimitException("AI is busy right now."));

        assertThatThrownBy(() -> groqService.analyzeMarks(testStudentId, marks))
                .isInstanceOf(RateLimitException.class);
    }

    @Test
    @DisplayName("Should handle empty subject averages gracefully")
    void testAnalyzeMarksEmptySubjects() {
        aiReturns("No subjects provided");

        assertThat(groqService.analyzeMarks(testStudentId, new HashMap<>())).isNotNull();
    }

    // ── Chat ─────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Should generate chat response for student questions")
    void testChatSuccess() {
        aiReturns("Photosynthesis converts light energy into chemical energy through chlorophyll.");

        String result = groqService.chat("How does photosynthesis work?", new ArrayList<>());

        assertThat(result).isNotNull().isNotEmpty().contains("energy");
        verify(aiProviderGateway, times(1)).complete(any());
        assertThat(capturedRequest().purpose()).isEqualTo("chat");
        assertThat(capturedRequest().prompt()).contains("How does photosynthesis work?");
    }

    @Test
    @DisplayName("Should limit context window to avoid token overflow")
    void testChatContextLimiting() {
        List<ChatHistory> history = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            ChatHistory h = new ChatHistory();
            h.setRole("user");
            h.setMessage("This is a long conversation message number " + i
                    + " with lots of content to fill the context");
            history.add(h);
        }
        aiReturns("Context limited response");

        groqService.chat("What about this?", history);

        // ~500 words of history plus the framing preamble and error analysis guidelines.
        int words = capturedRequest().prompt().split("\\s+").length;
        assertThat(words).isLessThan(950);
        assertThat(capturedRequest().prompt()).contains("Previous conversation:");
    }

    @Test
    @DisplayName("Should handle chat with empty history")
    void testChatEmptyHistory() {
        aiReturns("Calculus is mathematics of change and motion.");

        assertThat(groqService.chat("What is calculus?", new ArrayList<>())).isNotNull();
        assertThat(capturedRequest().prompt()).doesNotContain("Previous conversation:");
    }

    @Test
    @DisplayName("Should pass document context through to the provider verbatim")
    void testChatIncludesDocumentContext() {
        aiReturns("Third normal form removes transitive dependencies.");
        String documentContext = "Material: Unit-3 Normalization.pdf\nTopics: 1NF, 2NF, 3NF, BCNF\n"
                + "Difficulty: HARD (score 0.82)\nExtracted text: A relation is in 3NF when...";

        groqService.chat("Explain 3NF", new ArrayList<>(), documentContext);

        // Document grounding is only as good as what actually reaches the model, and both providers
        // must receive the same grounding text.
        String prompt = capturedRequest().prompt();
        assertThat(prompt).contains(documentContext);
        assertThat(prompt).contains("--- RELEVANT ACADEMIC MATERIAL / DOCUMENT CONTEXT ---");
        assertThat(prompt).contains("Use the academic material context above directly");
    }

    @Test
    @DisplayName("Should handle chat AI failure gracefully")
    void testChatAiFailure() {
        when(aiProviderGateway.complete(any()))
                .thenThrow(new AiProviderException("AI service temporarily unavailable"));

        assertThatThrownBy(() -> groqService.chat("How do I study better?", new ArrayList<>()))
                .isInstanceOf(AiProviderException.class);
    }

    // ── Topic suggestions ────────────────────────────────────────────────────────

    @Test
    @DisplayName("Should generate topic suggestions based on performance")
    void testGenerateTopicSuggestion() {
        aiReturns("Study recursive functions and backtracking");

        String result = groqService.generateTopicSuggestion("Data Structures", 65.0, 90, 3);

        assertThat(result).isNotNull().isNotEmpty();
        assertThat(capturedRequest().purpose()).isEqualTo("topic-suggestion");
        assertThat(capturedRequest().prompt()).contains("Data Structures", "65.00", "90 minute", "3 days");
    }

    @Test
    @DisplayName("Should truncate material summaries longer than 3000 characters")
    void testExtractTopicTruncatesSummaries() {
        StringBuilder summaries = new StringBuilder();
        for (int i = 0; i < 500; i++) {
            summaries.append("Chapter ").append(i).append(" covers a topic in detail. ");
        }
        aiReturns("  Graph traversal  ");

        String result = groqService.extractTopicFromMaterials("Algorithms", 70.0, 60, summaries.toString());

        assertThat(result).isEqualTo("Graph traversal");
        assertThat(capturedRequest().prompt()).contains("...");
        assertThat(capturedRequest().prompt().length()).isLessThan(3400);
    }

    // ── Material summarization and categorization ────────────────────────────────

    @Test
    @DisplayName("Should summarize material into bullet points")
    void testSummarizeMaterial() {
        aiReturns("- Wave-particle duality\n- Uncertainty principle\n- Superposition");

        String result = groqService.summarizeMaterial(
                "Chapter 1 discusses quantum mechanics. It covers wave-particle duality.");

        assertThat(result).isNotNull();
        assertThat(capturedRequest().purpose()).isEqualTo("summarize-material");
    }

    @Test
    @DisplayName("Should truncate content longer than 10000 characters")
    void testSummarizeMaterialTruncatesLongContent() {
        StringBuilder longContent = new StringBuilder();
        for (int i = 0; i < 1500; i++) {
            longContent.append("This is content block number ").append(i).append(" to test truncation. ");
        }
        aiReturns("Summary created");

        groqService.summarizeMaterial(longContent.toString());

        // The document-context limits are a performance guarantee: neither provider is ever sent the
        // whole file.
        assertThat(longContent.length()).isGreaterThan(10000);
        assertThat(capturedRequest().prompt().length()).isLessThan(10200);
    }

    @Test
    @DisplayName("Should categorize material by subject and trim the answer")
    void testCategorizeMaterial() {
        aiReturns("  Computer Science\n");

        String result = groqService.categorizeMaterial("Chapter_3_Algorithms.pdf",
                "Algorithm complexity analysis using Big O notation.");

        assertThat(result).isEqualTo("Computer Science");
        assertThat(capturedRequest().purpose()).isEqualTo("categorize-material");
        assertThat(capturedRequest().prompt()).contains("Chapter_3_Algorithms.pdf");
    }

    @Test
    @DisplayName("Should truncate preview longer than 2000 characters")
    void testCategorizeMaterialTruncatesPreview() {
        StringBuilder longPreview = new StringBuilder();
        for (int i = 0; i < 300; i++) {
            longPreview.append("This is preview content block number ").append(i).append(". ");
        }
        aiReturns("Mathematics");

        groqService.categorizeMaterial("math.txt", longPreview.toString());

        assertThat(longPreview.length()).isGreaterThan(2000);
        assertThat(capturedRequest().prompt().length()).isLessThan(2400);
    }

    @Test
    @DisplayName("Should handle categorization AI failure")
    void testCategorizeMaterialFailure() {
        when(aiProviderGateway.complete(any()))
                .thenThrow(new AiProviderException("AI service temporarily unavailable"));

        assertThatThrownBy(() -> groqService.categorizeMaterial("file.pdf", "content preview"))
                .isInstanceOf(AiProviderException.class);
    }

    @Test
    @DisplayName("Should handle summarization AI failure")
    void testSummarizeMaterialFailure() {
        when(aiProviderGateway.complete(any()))
                .thenThrow(new AiProviderException("AI service temporarily unavailable"));

        assertThatThrownBy(() -> groqService.summarizeMaterial("Some material to summarize"))
                .isInstanceOf(AiProviderException.class);
    }

    // ── Exam planning and motivation ─────────────────────────────────────────────

    @Test
    @DisplayName("Should generate structured exam preparation plan with exam and marks context")
    void testGenerateExamPlan() {
        List<ExamResponse> exams = new ArrayList<>();
        exams.add(ExamResponse.builder()
                .examName("Mathematics Final")
                .examDate(LocalDate.of(2026, 8, 15))
                .daysRemaining(24)
                .build());

        Map<String, Double> averages = new HashMap<>();
        averages.put("Math", 78.0);
        aiReturns("Day-by-day exam plan with structured topics and revision strategy");

        String result = groqService.generateExamPlan("John Doe", exams, averages);

        assertThat(result).isNotNull();
        assertThat(capturedRequest().purpose()).isEqualTo("exam-plan");
        // Student name, exams and averages all have to arrive at the provider together.
        assertThat(capturedRequest().prompt()).contains("John Doe", "Mathematics Final", "Math", "78.0");
    }

    @Test
    @DisplayName("Should request a motivational tip through the same provider chain")
    void testGetMotivationalTip() {
        aiReturns("Stay persistent and trust your preparation!");

        String tip = groqService.getMotivationalTip("2026-07-22");

        assertThat(tip).isEqualTo("Stay persistent and trust your preparation!");
        assertThat(capturedRequest().purpose()).isEqualTo("motivation");
        // Per-date caching is applied by Spring's proxy in the running app, not by this class.
        verify(aiProviderGateway, times(1)).complete(any());
    }

    // ── Provider neutrality ──────────────────────────────────────────────────────

    @Test
    @DisplayName("Returns the answer text only — never which provider produced it")
    void doesNotLeakProviderIdentityToCallers() {
        when(aiProviderGateway.complete(any()))
                .thenReturn(new AiCompletion("A clean answer.", "Groq", "openai/gpt-oss-20b", 900L));

        String result = groqService.chat("Anything", new ArrayList<>());

        // The frontend must not be able to tell AgentRouter from Groq.
        assertThat(result).isEqualTo("A clean answer.");
        assertThat(result).doesNotContain("Groq").doesNotContain("AgentRouter");
    }
}

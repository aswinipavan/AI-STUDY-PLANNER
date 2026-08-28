package com.aistudyplanner.service;

import com.aistudyplanner.service.ai.AiCompletion;
import com.aistudyplanner.service.ai.AiProviderGateway;
import com.aistudyplanner.service.ai.AiRequest;
import com.aistudyplanner.util.AiErrorSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("AI Tutor Error & Diagnostic Analysis Protocol Tests")
class AiErrorAnalysisTest {

    @Mock
    private AiProviderGateway aiProviderGateway;

    @InjectMocks
    private GroqService groqService;

    @BeforeEach
    void setUp() {
        lenient().when(aiProviderGateway.complete(any()))
                .thenReturn(new AiCompletion("## What happened\nYour request failed.\n\n## Root cause\nInvalid data.\n\n## What to do\nFix data.\n\n## Verify\nRetest.", "AgentRouter", "claude-opus-5", 50L));
    }

    private AiRequest captureRequest() {
        ArgumentCaptor<AiRequest> captor = ArgumentCaptor.forClass(AiRequest.class);
        verify(aiProviderGateway).complete(captor.capture());
        return captor.getValue();
    }

    @Test
    @DisplayName("1. Pasted HTTP 400 error receives structured error analysis instructions")
    void testPastedHttp400Error() {
        String errorInput = "POST http://localhost:8080/api/students/me HTTP/1.1 -> 400 Bad Request: Phone number is already associated with another account";

        groqService.chat(errorInput, new ArrayList<>());

        AiRequest request = captureRequest();
        assertThat(request.prompt()).contains("Technical Error & Diagnostic Analysis Protocol:");
        assertThat(request.prompt()).contains("## What happened");
        assertThat(request.prompt()).contains("## Root cause");
        assertThat(request.prompt()).contains("## What to do");
        assertThat(request.prompt()).contains("## Verify");
        assertThat(request.prompt()).contains("Phone number is already associated with another account");
    }

    @Test
    @DisplayName("2. Backend stack trace prompts extraction of Caused by and root exception without raw noise")
    void testBackendStackTraceAnalysis() {
        String stackTrace = "org.springframework.dao.DataIntegrityViolationException: could not execute statement; " +
                "nested exception is org.hibernate.exception.ConstraintViolationException: duplicate key value violates unique constraint \"uk_student_email\"\n" +
                "\tat org.springframework.orm.jpa.vendor.HibernateJpaDialect.convertHibernateAccessException(HibernateJpaDialect.java:276)\n" +
                "\tat com.aistudyplanner.service.impl.StudentServiceImpl.updateProfile(StudentServiceImpl.java:88)";

        groqService.chat(stackTrace, new ArrayList<>());

        AiRequest request = captureRequest();
        assertThat(request.prompt()).contains("Extract the essential evidence");
        assertThat(request.prompt()).contains("DO NOT dump or echo raw noisy debug data");
        assertThat(request.prompt()).contains("uk_student_email");
    }

    @Test
    @DisplayName("3. GitHub Actions CI log failure identifies failing step and root cause")
    void testGitHubActionsFailure() {
        String ciLog = "Run npx playwright test src/__tests__/e2e/timetable.spec.ts\n" +
                "Error: JWT_SECRET environment variable is not set. Export it before running Playwright tests\n" +
                "Error: Process completed with exit code 1.";

        groqService.chat(ciLog, new ArrayList<>());

        AiRequest request = captureRequest();
        assertThat(request.prompt()).contains("JWT_SECRET environment variable is not set");
        assertThat(request.prompt()).contains("Clearly distinguish confirmed facts");
    }

    @Test
    @DisplayName("4. JSON API error response structures clear actionable student guidance")
    void testJsonApiError() {
        String jsonError = "{\"success\":false,\"message\":\"Study session slot overlaps with an existing exam on 2026-09-01\",\"errorCode\":\"SLOT_OVERLAP\"}";

        groqService.chat(jsonError, new ArrayList<>());

        AiRequest request = captureRequest();
        assertThat(request.prompt()).contains("SLOT_OVERLAP");
        assertThat(request.prompt()).contains("## What to do");
    }

    @Test
    @DisplayName("5. Screenshot error OCR text receives structured analysis")
    void testScreenshotErrorText() {
        String screenshotOcr = "[Visible UI Screenshot Error]: Modal Dialog - 'Unable to generate timetable: Please select at least one subject with study materials.'";

        groqService.chat(screenshotOcr, new ArrayList<>());

        AiRequest request = captureRequest();
        assertThat(request.prompt()).contains("Please select at least one subject with study materials");
    }

    @Test
    @DisplayName("6. Sensitive credentials, JWTs, and Authorization headers are automatically redacted")
    void testSensitiveDataRedaction() {
        String inputWithSecrets = "Request Headers:\n" +
                "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0In0.mockSignature1234567890123456789012345\n" +
                "Cookie: access_token=secret_cookie_val_12345; session=abcde\n" +
                "API_KEY: sk_live_secret_key_123456789abcdef\n" +
                "Error: 401 Unauthorized";

        groqService.chat(inputWithSecrets, new ArrayList<>());

        AiRequest request = captureRequest();
        assertThat(request.prompt()).doesNotContain("mockSignature1234567890123456789012345");
        assertThat(request.prompt()).doesNotContain("sk_live_secret_key_123456789abcdef");
        assertThat(request.prompt()).contains("[redacted]");
    }

    @Test
    @DisplayName("7. Ambiguous error protocol enforces labeling inferences vs confirmed facts")
    void testInferenceLabelingProtocol() {
        String ambiguousError = "Network error: Fetch failed when contacting /api/timetable/generate";

        groqService.chat(ambiguousError, new ArrayList<>());

        AiRequest request = captureRequest();
        assertThat(request.prompt()).contains("Never state an inference as a confirmed fact");
        assertThat(request.prompt()).contains("Clearly distinguish confirmed facts");
    }

    @Test
    @DisplayName("8. Noisy debug headers and cookies are flagged for suppression")
    void testNoiseSuppressionGuideline() {
        String noisyLog = "Host: localhost:8080\nUser-Agent: Mozilla/1.0 Chrome/120.0.0.0\nSec-Ch-Ua: Chromium\nAccept: */*\n500 Internal Server Error";

        groqService.chat(noisyLog, new ArrayList<>());

        AiRequest request = captureRequest();
        assertThat(request.prompt()).contains("DO NOT dump or echo raw noisy debug data (headers, cookies, User-Agents");
    }

    @Test
    @DisplayName("9. AiErrorSanitizer utility unit tests verify exact regex matching")
    void testAiErrorSanitizerUtility() {
        String raw = "Authorization: Bearer secretToken123456789\nCookie: session_id=abcdef123456\nJWT_SECRET: super_secret_test_key_99999\nError: Connection failed";
        String sanitized = AiErrorSanitizer.redactSensitiveData(raw);

        assertThat(sanitized).doesNotContain("secretToken123456789");
        assertThat(sanitized).doesNotContain("session_id=abcdef123456");
        assertThat(sanitized).doesNotContain("super_secret_test_key_99999");
        assertThat(sanitized).contains("[redacted]");
        assertThat(AiErrorSanitizer.isDiagnosticOrErrorInput(raw)).isTrue();
    }
}
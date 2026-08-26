package com.aistudyplanner.service.ai;

import com.aistudyplanner.exception.AiProviderException;
import com.aistudyplanner.exception.RateLimitException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Provider-selection and fallback behaviour.
 *
 * <p>Both providers are mocked, so nothing here touches a network. What is being pinned down is the
 * decision logic: order, when to fall back, when emphatically <em>not</em> to, how many times a
 * provider may be called, and which single application-level error the caller ends up with.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AI Provider Gateway — selection, fallback and error contract")
class AiProviderGatewayTest {

    @Mock
    private AiProvider primary;

    @Mock
    private AiProvider fallback;

    private AiRequest request;

    @BeforeEach
    void setUp() {
        request = AiRequest.of("Explain normalization in databases.", "chat");

        when(primary.name()).thenReturn("AgentRouter");
        when(primary.model()).thenReturn("claude-opus-5");
        when(primary.isConfigured()).thenReturn(true);

        when(fallback.name()).thenReturn("Groq");
        when(fallback.model()).thenReturn("openai/gpt-oss-20b");
        when(fallback.isConfigured()).thenReturn(true);
    }

    private AiProviderGateway gateway() {
        return new AiProviderGateway(List.of(primary, fallback));
    }

    private AiCompletion completion(String text, String provider) {
        return new AiCompletion(text, provider, "model", 12L);
    }

    private void primaryFailsWith(AiFailureKind kind, int httpStatus) {
        when(primary.complete(any())).thenThrow(
                new AiProviderCallException("AgentRouter", kind, httpStatus, "simulated " + kind, null));
    }

    // ── §16 A — AgentRouter success ──────────────────────────────────────────────

    @Test
    @DisplayName("A: AgentRouter succeeds — its answer is returned and Groq is never contacted")
    void agentRouterSuccessDoesNotTouchFallback() {
        when(primary.complete(any())).thenReturn(completion("Normalization removes redundancy.", "AgentRouter"));

        AiCompletion result = gateway().complete(request);

        assertThat(result.text()).isEqualTo("Normalization removes redundancy.");
        assertThat(result.provider()).isEqualTo("AgentRouter");
        verify(primary, times(1)).complete(any());
        verify(fallback, never()).complete(any());
    }

    // ── §16 B–F — every provider fault falls back exactly once ───────────────────

    @Nested
    @DisplayName("Fallback triggers")
    class FallbackTriggers {

        private void assertFallsBackOnce(AiFailureKind kind, int httpStatus) {
            primaryFailsWith(kind, httpStatus);
            when(fallback.complete(any())).thenReturn(completion("Groq answer", "Groq"));

            AiCompletion result = gateway().complete(request);

            assertThat(result.text()).isEqualTo("Groq answer");
            assertThat(result.provider()).isEqualTo("Groq");
            // Exactly one call each: the chain must not duplicate a request or retry in a loop.
            verify(primary, times(1)).complete(any());
            verify(fallback, times(1)).complete(any());
        }

        @Test
        @DisplayName("B: AgentRouter timeout falls back to Groq")
        void timeout() {
            assertFallsBackOnce(AiFailureKind.TIMEOUT, 0);
        }

        @Test
        @DisplayName("C: AgentRouter HTTP 429 falls back to Groq")
        void rateLimited() {
            assertFallsBackOnce(AiFailureKind.RATE_LIMITED, 429);
        }

        @Test
        @DisplayName("D: AgentRouter HTTP 500 falls back to Groq")
        void serverError() {
            assertFallsBackOnce(AiFailureKind.SERVER_ERROR, 500);
        }

        @Test
        @DisplayName("E: AgentRouter malformed response falls back to Groq")
        void malformedResponse() {
            assertFallsBackOnce(AiFailureKind.MALFORMED_RESPONSE, 200);
        }

        @Test
        @DisplayName("E2: AgentRouter response with no usable text falls back to Groq")
        void emptyResponse() {
            assertFallsBackOnce(AiFailureKind.EMPTY_RESPONSE, 200);
        }

        @Test
        @DisplayName("F: AgentRouter unreachable (DNS/connection) falls back to Groq")
        void networkFailure() {
            assertFallsBackOnce(AiFailureKind.NETWORK, 0);
        }

        @Test
        @DisplayName("F2: AgentRouter HTTP 503 — the status an unknown model returns — falls back to Groq")
        void unknownModelIsIndistinguishableFromOutage() {
            assertFallsBackOnce(AiFailureKind.SERVER_ERROR, 503);
        }

        @Test
        @DisplayName("A rejected AgentRouter key (401) still falls back rather than failing the request")
        void clientError() {
            assertFallsBackOnce(AiFailureKind.CLIENT_ERROR, 401);
        }
    }

    // ── §16 G — both providers down ──────────────────────────────────────────────

    @Test
    @DisplayName("G: both providers fail — one clean application-level 503, no provider detail leaked")
    void bothProvidersFailProducesOneCleanError() {
        primaryFailsWith(AiFailureKind.SERVER_ERROR, 500);
        when(fallback.complete(any())).thenThrow(
                new AiProviderCallException("Groq", AiFailureKind.TIMEOUT, "simulated timeout"));

        assertThatThrownBy(() -> gateway().complete(request))
                .isInstanceOf(AiProviderException.class)
                .hasMessage("AI service temporarily unavailable")
                // Nothing identifying a provider, a status code or a key may reach the caller.
                .hasMessageNotContaining("AgentRouter")
                .hasMessageNotContaining("Groq")
                .hasMessageNotContaining("500");

        verify(primary, times(1)).complete(any());
        verify(fallback, times(1)).complete(any());
    }

    @Test
    @DisplayName("G2: when every failure was a rate limit the caller still gets 429, not 503")
    void allRateLimitedKeepsTooManyRequests() {
        primaryFailsWith(AiFailureKind.RATE_LIMITED, 429);
        when(fallback.complete(any())).thenThrow(
                new AiProviderCallException("Groq", AiFailureKind.RATE_LIMITED, 429, "throttled", null));

        // Preserves the status this API has always returned for a throttled AI call, which a client
        // can sensibly retry, instead of flattening it into a generic outage.
        assertThatThrownBy(() -> gateway().complete(request))
                .isInstanceOf(RateLimitException.class);
    }

    @Test
    @DisplayName("G3: no provider configured at all — 503, and no provider is even attempted")
    void noProviderConfigured() {
        when(primary.isConfigured()).thenReturn(false);
        when(fallback.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> gateway().complete(request))
                .isInstanceOf(AiProviderException.class);

        verify(primary, never()).complete(any());
        verify(fallback, never()).complete(any());
    }

    // ── §16 H — ordering ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("H: AgentRouter is always attempted before Groq")
    void agentRouterIsAlwaysAttemptedFirst() {
        primaryFailsWith(AiFailureKind.SERVER_ERROR, 500);
        when(fallback.complete(any())).thenReturn(completion("Groq answer", "Groq"));

        AiProviderGateway gateway = gateway();
        assertThat(gateway.providerOrder()).containsExactly("AgentRouter", "Groq");

        gateway.complete(request);

        inOrder(primary, fallback).verify(primary).complete(any());
        inOrder(primary, fallback).verify(fallback).complete(any());
    }

    @Test
    @DisplayName("H2: an unconfigured AgentRouter is skipped silently and Groq serves the request")
    void unconfiguredPrimaryIsSkipped() {
        when(primary.isConfigured()).thenReturn(false);
        when(fallback.complete(any())).thenReturn(completion("Groq answer", "Groq"));

        // This is the shape of an existing deployment that only ever set GROQ_API_KEY: it must keep
        // working exactly as it did before the primary provider existed.
        AiCompletion result = gateway().complete(request);

        assertThat(result.provider()).isEqualTo("Groq");
        verify(primary, never()).complete(any());
    }

    // ── §5 — our own bugs must not cascade into a second provider call ───────────

    @Test
    @DisplayName("A bug in our own code propagates immediately and never triggers a fallback")
    void applicationBugDoesNotFallBack() {
        // Not an AiProviderCallException, so it is not a provider fault. Retrying Groq with the same
        // broken input would only burn quota and mask the defect.
        when(primary.complete(any())).thenThrow(new IllegalStateException("null student id"));

        assertThatThrownBy(() -> gateway().complete(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("null student id");

        verify(fallback, never()).complete(any());
    }

    @Test
    @DisplayName("A blank prompt is rejected before any provider is contacted")
    void blankPromptNeverReachesAProvider() {
        assertThatThrownBy(() -> AiRequest.of("   ", "chat"))
                .isInstanceOf(IllegalArgumentException.class);

        verify(primary, never()).complete(any());
        verify(fallback, never()).complete(any());
    }

    // ── §16 J — the request handed to both providers is identical ────────────────

    @Test
    @DisplayName("J: the fallback receives the very same request object the primary was given")
    void fallbackReceivesIdenticalRequest() {
        AiRequest rich = new AiRequest(
                "Student: Aswini | WEAK AREA: Physics 42% | Exam: DBMS in 4 days | "
                        + "Material: Unit-3 Normalization (topics: 1NF, 2NF, BCNF) | "
                        + "Timetable: 2 completed, 1 missed | Question: what should I revise tonight?",
                0.7, 1000, "chat");

        primaryFailsWith(AiFailureKind.TIMEOUT, 0);
        when(fallback.complete(any())).thenReturn(completion("Revise BCNF.", "Groq"));

        gateway().complete(rich);

        // Same prompt, same temperature, same ceiling — the provider layer only transports context,
        // it never rebuilds or trims it, so switching provider cannot change what the model was told.
        verify(primary).complete(rich);
        verify(fallback).complete(rich);
    }

    @Test
    @DisplayName("isAnyProviderConfigured reflects the chain without exposing credentials")
    void reportsConfigurationState() {
        assertThat(gateway().isAnyProviderConfigured()).isTrue();

        when(primary.isConfigured()).thenReturn(false);
        when(fallback.isConfigured()).thenReturn(false);
        assertThat(gateway().isAnyProviderConfigured()).isFalse();
    }
}

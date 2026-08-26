package com.aistudyplanner.service.ai.provider;

import com.aistudyplanner.config.GroqConfig;
import com.aistudyplanner.service.ai.AiCompletion;
import com.aistudyplanner.service.ai.AiFailureKind;
import com.aistudyplanner.service.ai.AiProviderCallException;
import com.aistudyplanner.service.ai.AiRequest;
import com.aistudyplanner.util.Constants;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.net.SocketTimeoutException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The Groq wire contract, carried over unchanged from the transport that used to live inside
 * {@code GroqService}.
 *
 * <p>These assertions are the regression net for the refactor: OpenAI-compatible endpoint and body,
 * Bearer auth, the {@code choices} parse with the legacy {@code candidates} shape as a second chance,
 * the {@code <think>} strip, the single 2.5s retry on a 429, and the self-imposed per-minute limit. If
 * any of them changed, the fallback path would no longer behave like the AI the app shipped with.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Groq provider — OpenAI-compatible wire contract (unchanged fallback behaviour)")
class GroqProviderTest {

    private static final String API_KEY = "test-groq-key";

    @Mock
    private RestTemplate restTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private GroqProvider provider(String apiKey, boolean enabled) {
        return new GroqProvider(restTemplate, objectMapper, apiKey, "openai/gpt-oss-20b", enabled);
    }

    private GroqProvider provider() {
        return provider(API_KEY, true);
    }

    private AiRequest request() {
        return AiRequest.of("Summarize this study material.", "summarize-material");
    }

    private void respondWith(String body) {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(body);
    }

    private static String choices(String content) {
        return "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"" + content + "\"}}]}";
    }

    @SuppressWarnings("unchecked")
    private HttpEntity<Map<String, Object>> capturedEntity() {
        ArgumentCaptor<HttpEntity<Map<String, Object>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForObject(anyString(), captor.capture(), eq(String.class));
        return captor.getValue();
    }

    // ── Request shape ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Posts to the Groq OpenAI-compatible chat-completions endpoint with Bearer auth")
    void postsToGroqEndpointWithBearerAuth() {
        respondWith(choices("ok"));

        provider().complete(request());

        ArgumentCaptor<String> url = ArgumentCaptor.forClass(String.class);
        verify(restTemplate).postForObject(url.capture(), any(HttpEntity.class), eq(String.class));
        assertThat(url.getValue()).isEqualTo(GroqConfig.GROQ_API_URL);

        HttpHeaders headers = capturedEntity().getHeaders();
        assertThat(headers.getFirst(HttpHeaders.AUTHORIZATION)).isEqualTo("Bearer " + API_KEY);
        assertThat(headers.getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
    }

    @Test
    @DisplayName("Body uses the configured model and the caller's temperature and token ceiling verbatim")
    void buildsOpenAiStyleBody() {
        respondWith(choices("ok"));

        provider().complete(request());
        Map<String, Object> body = capturedEntity().getBody();

        assertThat(body).isNotNull();
        assertThat(body.get("model")).isEqualTo("openai/gpt-oss-20b");
        assertThat(body.get("temperature")).isEqualTo(AiRequest.DEFAULT_TEMPERATURE);
        // No headroom here: Groq does not emit thinking blocks that eat the budget.
        assertThat(body.get("max_tokens")).isEqualTo(AiRequest.DEFAULT_MAX_TOKENS);
        assertThat(body.get("messages").toString()).contains("Summarize this study material.");
    }

    @Test
    @DisplayName("A blank configured model falls back to the shipped default")
    void blankModelFallsBackToDefault() {
        GroqProvider blankModel = new GroqProvider(restTemplate, objectMapper, API_KEY, "  ", true);
        assertThat(blankModel.model()).isEqualTo("openai/gpt-oss-20b");
    }

    // ── Response parsing ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("Parses the OpenAI choices shape")
    void parsesChoices() {
        respondWith(choices("Five bullet points about quantum mechanics."));

        AiCompletion completion = provider().complete(request());

        assertThat(completion.text()).isEqualTo("Five bullet points about quantum mechanics.");
        assertThat(completion.provider()).isEqualTo("Groq");
        assertThat(completion.model()).isEqualTo("openai/gpt-oss-20b");
    }

    @Test
    @DisplayName("Still parses the legacy candidates shape the app was originally written against")
    void parsesLegacyCandidatesShape() {
        respondWith("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Legacy shaped answer\"}]}}]}");

        assertThat(provider().complete(request()).text()).isEqualTo("Legacy shaped answer");
    }

    @Test
    @DisplayName("Strips inline <think> reasoning some Groq-hosted models emit")
    void stripsThinkTags() {
        respondWith(choices("<think>weighing the options</think>The answer is normalization."));

        assertThat(provider().complete(request()).text()).isEqualTo("The answer is normalization.");
    }

    @Test
    @DisplayName("Keeps the raw text when stripping <think> would leave nothing")
    void keepsContentWhenStripLeavesNothing() {
        respondWith(choices("<think>only reasoning</think>"));

        assertThat(provider().complete(request()).text()).isEqualTo("<think>only reasoning</think>");
    }

    @Test
    @DisplayName("A response matching neither shape is malformed")
    void malformedResponse() {
        respondWith("{\"unexpected\":true}");

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.MALFORMED_RESPONSE));
    }

    @Test
    @DisplayName("Unparseable JSON is malformed")
    void unparseableJson() {
        respondWith("<html>gateway error</html>");

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.MALFORMED_RESPONSE));
    }

    @Test
    @DisplayName("An empty body is an empty response")
    void emptyBody() {
        respondWith("  ");

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.EMPTY_RESPONSE));
    }

    // ── Failure classification and the single retry ──────────────────────────────

    @Test
    @DisplayName("A 429 is retried exactly once, then reported as rate limited")
    void retriesOnceOnRateLimitThenGivesUp() {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.TOO_MANY_REQUESTS,
                        "Too Many Requests", HttpHeaders.EMPTY, new byte[0], null));

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.RATE_LIMITED));

        // Two attempts total — one retry, bounded. Never a loop.
        verify(restTemplate, times(2)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    @Test
    @DisplayName("A 429 followed by a success returns the answer from the retry")
    void retrySucceeds() {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.TOO_MANY_REQUESTS,
                        "Too Many Requests", HttpHeaders.EMPTY, new byte[0], null))
                .thenReturn(choices("Answer after retry"));

        assertThat(provider().complete(request()).text()).isEqualTo("Answer after retry");
        verify(restTemplate, times(2)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    @Test
    @DisplayName("A 5xx is a server error and is not retried")
    void serverErrorIsNotRetried() {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(HttpServerErrorException.create(HttpStatus.BAD_GATEWAY,
                        "Bad Gateway", HttpHeaders.EMPTY, new byte[0], null));

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> {
                    AiProviderCallException call = (AiProviderCallException) ex;
                    assertThat(call.getKind()).isEqualTo(AiFailureKind.SERVER_ERROR);
                    assertThat(call.getHttpStatus()).isEqualTo(502);
                });

        verify(restTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    @Test
    @DisplayName("A read timeout is classified as a timeout")
    void timeout() {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new ResourceAccessException("read timed out", new SocketTimeoutException("timeout")));

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.TIMEOUT));
    }

    @Test
    @DisplayName("A rejected key (401) is a client error")
    void unauthorized() {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.UNAUTHORIZED,
                        "Unauthorized", HttpHeaders.EMPTY, new byte[0], null));

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.CLIENT_ERROR));
    }

    // ── Self-imposed per-minute limit ────────────────────────────────────────────

    @Test
    @DisplayName("The per-minute limit still applies, and trips without issuing a request")
    void localRateLimitStillEnforced() {
        respondWith(choices("ok"));
        GroqProvider groq = provider();

        for (int i = 0; i < Constants.GROQ_RATE_LIMIT_PER_MINUTE; i++) {
            groq.complete(request());
        }

        assertThatThrownBy(() -> groq.complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.RATE_LIMITED));

        // The over-limit call is refused locally, so it never reaches Groq.
        verify(restTemplate, times(Constants.GROQ_RATE_LIMIT_PER_MINUTE))
                .postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    // ── Configuration gating ─────────────────────────────────────────────────────

    @Test
    @DisplayName("A blank key means unconfigured, so the gateway skips Groq instead of calling it")
    void blankKeyIsNotConfigured() {
        assertThat(provider("", true).isConfigured()).isFalse();
        assertThat(provider(API_KEY, false).isConfigured()).isFalse();
        assertThat(provider().isConfigured()).isTrue();
    }

    @Test
    @DisplayName("Calling an unconfigured provider reports NOT_CONFIGURED without any HTTP traffic")
    void unconfiguredCallMakesNoRequest() {
        assertThatThrownBy(() -> provider("", true).complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.NOT_CONFIGURED));
    }
}

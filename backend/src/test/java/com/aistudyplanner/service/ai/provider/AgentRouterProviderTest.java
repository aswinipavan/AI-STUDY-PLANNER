package com.aistudyplanner.service.ai.provider;

import com.aistudyplanner.service.ai.AiCompletion;
import com.aistudyplanner.service.ai.AiFailureKind;
import com.aistudyplanner.service.ai.AiProviderCallException;
import com.aistudyplanner.service.ai.AiRequest;
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
import java.net.UnknownHostException;
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
 * The AgentRouter wire contract, pinned to what the live service actually accepts and returns.
 *
 * <p>Each assertion here corresponds to something that was verified against the real endpoint during
 * implementation, and several of them guard against a mistake that produced a 401 or an empty answer in
 * practice: Bearer auth instead of {@code x-api-key}, a generic user-agent, a double slash in the URL,
 * or trusting the first content block instead of filtering for {@code text}.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AgentRouter provider — Anthropic Messages wire contract")
class AgentRouterProviderTest {

    private static final String API_KEY = "test-agentrouter-key";

    @Mock
    private RestTemplate restTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private AgentRouterProvider provider(String baseUrl, boolean enabled, String apiKey) {
        return new AgentRouterProvider(restTemplate, objectMapper, apiKey, baseUrl, "claude-opus-5",
                enabled, "2023-06-01", "claude-cli/2.0.0 (external, cli)", true, 1024);
    }

    private AgentRouterProvider provider() {
        return provider("https://agentrouter.org", true, API_KEY);
    }

    private AiRequest request() {
        return AiRequest.of("Student's question: what is normalization?", "chat");
    }

    private void respondWith(String body) {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(body);
    }

    @SuppressWarnings("unchecked")
    private HttpEntity<Map<String, Object>> capturedEntity() {
        ArgumentCaptor<HttpEntity<Map<String, Object>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForObject(anyString(), captor.capture(), eq(String.class));
        return captor.getValue();
    }

    private String capturedUrl() {
        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(restTemplate).postForObject(captor.capture(), any(HttpEntity.class), eq(String.class));
        return captor.getValue();
    }

    // ── Request shape ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Posts to <base>/v1/messages — the Messages API, not the OpenAI surface")
    void postsToMessagesEndpoint() {
        respondWith("{\"content\":[{\"type\":\"text\",\"text\":\"ok\"}],\"stop_reason\":\"end_turn\"}");

        provider().complete(request());

        // /v1/chat/completions is rejected with 401 by this router, so the path matters.
        assertThat(capturedUrl()).isEqualTo("https://agentrouter.org/v1/messages");
    }

    @Test
    @DisplayName("A base URL with a trailing slash does not produce a double slash")
    void normalisesTrailingSlashInBaseUrl() {
        respondWith("{\"content\":[{\"type\":\"text\",\"text\":\"ok\"}]}");

        // ANTHROPIC_BASE_URL is conventionally written with a trailing slash.
        provider("https://agentrouter.org/", true, API_KEY).complete(request());

        assertThat(capturedUrl()).isEqualTo("https://agentrouter.org/v1/messages");
    }

    @Test
    @DisplayName("Authenticates with x-api-key and the anthropic-version header, never with Bearer")
    void sendsAnthropicStyleAuthHeaders() {
        respondWith("{\"content\":[{\"type\":\"text\",\"text\":\"ok\"}]}");

        provider().complete(request());
        HttpHeaders headers = capturedEntity().getHeaders();

        assertThat(headers.getFirst("x-api-key")).isEqualTo(API_KEY);
        assertThat(headers.getFirst("anthropic-version")).isEqualTo("2023-06-01");
        assertThat(headers.getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
        // Bearer is refused by this router with unauthorized_client_error.
        assertThat(headers.getFirst(HttpHeaders.AUTHORIZATION)).isNull();
    }

    @Test
    @DisplayName("Sends the CLI-style user-agent the router requires alongside a valid key")
    void sendsConfiguredUserAgent() {
        respondWith("{\"content\":[{\"type\":\"text\",\"text\":\"ok\"}]}");

        provider().complete(request());

        // A default HTTP client signature is rejected even when the key is valid.
        assertThat(capturedEntity().getHeaders().getFirst(HttpHeaders.USER_AGENT))
                .isEqualTo("claude-cli/2.0.0 (external, cli)");
    }

    @Test
    @DisplayName("Body carries the configured model, the prompt, and token headroom for thinking")
    void buildsMessagesBody() {
        respondWith("{\"content\":[{\"type\":\"text\",\"text\":\"ok\"}]}");

        provider().complete(request());
        Map<String, Object> body = capturedEntity().getBody();

        assertThat(body).isNotNull();
        assertThat(body.get("model")).isEqualTo("claude-opus-5");
        assertThat(body.get("temperature")).isEqualTo(AiRequest.DEFAULT_TEMPERATURE);
        // The caller's ceiling plus headroom, so a thinking block cannot consume the whole budget.
        assertThat(body.get("max_tokens")).isEqualTo(AiRequest.DEFAULT_MAX_TOKENS + 1024);
        assertThat(body.get("messages").toString()).contains("what is normalization?");
    }

    // ── Response parsing ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("Reads the text block and reports itself as the answering provider")
    void parsesTextBlock() {
        respondWith("{\"content\":[{\"type\":\"text\",\"text\":\"Normalization removes redundancy.\"}],"
                + "\"stop_reason\":\"end_turn\",\"model\":\"claude-opus-5\"}");

        AiCompletion completion = provider().complete(request());

        assertThat(completion.text()).isEqualTo("Normalization removes redundancy.");
        assertThat(completion.provider()).isEqualTo("AgentRouter");
        assertThat(completion.model()).isEqualTo("claude-opus-5");
        verify(restTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    @Test
    @DisplayName("Skips thinking blocks — internal reasoning must never reach a student")
    void ignoresThinkingBlocks() {
        // This is the real shape observed from the live router: a thinking block arrives first even
        // when thinking is requested as disabled.
        respondWith("{\"content\":["
                + "{\"type\":\"thinking\",\"thinking\":\"Let me consider the 1NF definition...\",\"signature\":\"abc\"},"
                + "{\"type\":\"text\",\"text\":\"Normalization organises tables to reduce redundancy.\"}"
                + "],\"stop_reason\":\"end_turn\"}");

        AiCompletion completion = provider().complete(request());

        assertThat(completion.text()).isEqualTo("Normalization organises tables to reduce redundancy.");
        assertThat(completion.text()).doesNotContain("1NF definition");
    }

    @Test
    @DisplayName("Concatenates multiple text blocks in order")
    void concatenatesTextBlocks() {
        respondWith("{\"content\":[{\"type\":\"text\",\"text\":\"First. \"},"
                + "{\"type\":\"text\",\"text\":\"Second.\"}]}");

        assertThat(provider().complete(request()).text()).isEqualTo("First. Second.");
    }

    @Test
    @DisplayName("A reply that is only thinking counts as empty so the gateway can fall back")
    void thinkingOnlyResponseIsEmpty() {
        // Observed when max_tokens is spent entirely on thinking: 200 OK, well formed, no answer.
        respondWith("{\"content\":[{\"type\":\"thinking\",\"thinking\":\"\",\"signature\":\"x\"}],"
                + "\"stop_reason\":\"max_tokens\"}");

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.EMPTY_RESPONSE));
    }

    @Test
    @DisplayName("Unparseable JSON is a malformed response")
    void unparseableJson() {
        respondWith("not json at all");

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.MALFORMED_RESPONSE));
    }

    @Test
    @DisplayName("A response without a content array is a malformed response")
    void missingContentArray() {
        respondWith("{\"id\":\"msg_1\",\"stop_reason\":\"end_turn\"}");

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.MALFORMED_RESPONSE));
    }

    @Test
    @DisplayName("A 200 that carries an error envelope is not trusted")
    void errorEnvelopeOnSuccessStatus() {
        respondWith("{\"error\":{\"message\":\"upstream failure\"},\"success\":false}");

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.MALFORMED_RESPONSE));
    }

    @Test
    @DisplayName("An empty body is an empty response")
    void emptyBody() {
        respondWith("");

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.EMPTY_RESPONSE));
    }

    // ── Failure classification ───────────────────────────────────────────────────

    private void assertClassifies(Throwable thrown, AiFailureKind expectedKind, int expectedStatus) {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenThrow(thrown);

        assertThatThrownBy(() -> provider().complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> {
                    AiProviderCallException call = (AiProviderCallException) ex;
                    assertThat(call.getKind()).isEqualTo(expectedKind);
                    assertThat(call.getHttpStatus()).isEqualTo(expectedStatus);
                    assertThat(call.getProviderName()).isEqualTo("AgentRouter");
                });

        // One attempt, never a retry loop: the gateway owns the fallback decision.
        verify(restTemplate, times(1)).postForObject(anyString(), any(HttpEntity.class), eq(String.class));
    }

    @Test
    @DisplayName("HTTP 429 is classified as rate limited")
    void classifiesTooManyRequests() {
        assertClassifies(HttpClientErrorException.create(HttpStatus.TOO_MANY_REQUESTS,
                "Too Many Requests", HttpHeaders.EMPTY, new byte[0], null),
                AiFailureKind.RATE_LIMITED, 429);
    }

    @Test
    @DisplayName("HTTP 500 is classified as a server error")
    void classifiesServerError() {
        assertClassifies(HttpServerErrorException.create(HttpStatus.INTERNAL_SERVER_ERROR,
                "Server Error", HttpHeaders.EMPTY, new byte[0], null),
                AiFailureKind.SERVER_ERROR, 500);
    }

    @Test
    @DisplayName("HTTP 503 — what an unknown model returns — is classified as a server error")
    void classifiesUnknownModelAsServerError() {
        assertClassifies(HttpServerErrorException.create(HttpStatus.SERVICE_UNAVAILABLE,
                "Service Unavailable", HttpHeaders.EMPTY, new byte[0], null),
                AiFailureKind.SERVER_ERROR, 503);
    }

    @Test
    @DisplayName("HTTP 401 (rejected key or client) is classified as a client error")
    void classifiesUnauthorized() {
        assertClassifies(HttpClientErrorException.create(HttpStatus.UNAUTHORIZED,
                "Unauthorized", HttpHeaders.EMPTY, new byte[0], null),
                AiFailureKind.CLIENT_ERROR, 401);
    }

    @Test
    @DisplayName("A socket timeout is classified as a timeout")
    void classifiesTimeout() {
        assertClassifies(new ResourceAccessException("read timed out", new SocketTimeoutException("timeout")),
                AiFailureKind.TIMEOUT, 0);
    }

    @Test
    @DisplayName("An unresolvable host is classified as a network failure")
    void classifiesDnsFailure() {
        assertClassifies(new ResourceAccessException("no such host",
                        new UnknownHostException("agentrouter.invalid")),
                AiFailureKind.NETWORK, 0);
    }

    // ── Configuration gating ─────────────────────────────────────────────────────

    @Test
    @DisplayName("A blank key means unconfigured, so the gateway skips this provider entirely")
    void blankKeyIsNotConfigured() {
        assertThat(provider("https://agentrouter.org", true, "").isConfigured()).isFalse();
        assertThat(provider("https://agentrouter.org", true, "   ").isConfigured()).isFalse();
        assertThat(provider().isConfigured()).isTrue();
    }

    @Test
    @DisplayName("The enabled flag disables the primary without reordering the chain")
    void enabledFlagGatesTheProvider() {
        // This is the kill switch used to simulate an AgentRouter outage without touching code — the
        // order AgentRouter-then-Groq is never reversed, the primary is simply taken out.
        assertThat(provider("https://agentrouter.org", false, API_KEY).isConfigured()).isFalse();
    }

    @Test
    @DisplayName("Calling an unconfigured provider reports NOT_CONFIGURED without any HTTP traffic")
    void unconfiguredCallMakesNoRequest() {
        assertThatThrownBy(() -> provider("https://agentrouter.org", true, "").complete(request()))
                .isInstanceOf(AiProviderCallException.class)
                .satisfies(ex -> assertThat(((AiProviderCallException) ex).getKind())
                        .isEqualTo(AiFailureKind.NOT_CONFIGURED));
    }
}

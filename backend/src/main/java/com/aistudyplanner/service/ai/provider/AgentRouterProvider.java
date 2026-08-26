package com.aistudyplanner.service.ai.provider;

import com.aistudyplanner.config.AgentRouterConfig;
import com.aistudyplanner.service.ai.AiCompletion;
import com.aistudyplanner.service.ai.AiFailureKind;
import com.aistudyplanner.service.ai.AiProvider;
import com.aistudyplanner.service.ai.AiProviderCallException;
import com.aistudyplanner.service.ai.AiRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PRIMARY provider: Claude via AgentRouter.
 *
 * <p>AgentRouter speaks the <strong>Anthropic Messages API</strong>, not the OpenAI chat-completions
 * format Groq uses, so this class is a genuinely different translation rather than a copy of
 * {@link GroqProvider} with a different URL. Three details were established against the live service
 * and each one is load-bearing:
 *
 * <ol>
 *   <li><strong>Authentication is {@code x-api-key}, not {@code Authorization: Bearer}.</strong> Bearer
 *       is rejected with 401 {@code unauthorized_client_error}.</li>
 *   <li><strong>The router fingerprints the client.</strong> The same key with a default HTTP
 *       user-agent is refused; a CLI-style user-agent is accepted. Hence the configurable
 *       {@code agentrouter.user-agent}, which is not decoration.</li>
 *   <li><strong>Replies can contain {@code thinking} blocks.</strong> They arrive even when
 *       {@code thinking: {"type": "disabled"}} is sent, and they consume the {@code max_tokens}
 *       budget — a small budget can be spent entirely on thinking, returning
 *       {@code stop_reason: "max_tokens"} and no text at all. So the parser walks every block and
 *       keeps only {@code type == "text"}, and the request adds headroom on top of the caller's token
 *       ceiling.</li>
 * </ol>
 *
 * <p>Also worth knowing when reading the failure mapping: an unrecognised model id comes back as
 * <strong>HTTP 503</strong>, not 400. Bad configuration and a genuine outage are therefore
 * indistinguishable from here — which is exactly why 5xx falls back rather than failing hard.
 */
@Component
@Order(10)
public class AgentRouterProvider implements AiProvider {

    public static final String PROVIDER_NAME = "AgentRouter";

    private static final Logger log = LoggerFactory.getLogger(AgentRouterProvider.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final boolean enabled;
    private final String anthropicVersion;
    private final String userAgent;
    private final boolean disableThinking;
    private final int thinkingHeadroomTokens;

    public AgentRouterProvider(
            @Qualifier("agentRouterRestTemplate") RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @Value("${agentrouter.api-key:}") String apiKey,
            @Value("${agentrouter.base-url:https://agentrouter.org}") String baseUrl,
            @Value("${agentrouter.model:claude-opus-5}") String model,
            @Value("${agentrouter.enabled:true}") boolean enabled,
            @Value("${agentrouter.anthropic-version:2023-06-01}") String anthropicVersion,
            @Value("${agentrouter.user-agent:claude-cli/2.0.0 (external, cli)}") String userAgent,
            @Value("${agentrouter.disable-thinking:true}") boolean disableThinking,
            @Value("${agentrouter.thinking-headroom-tokens:1024}") int thinkingHeadroomTokens) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = normaliseBaseUrl(baseUrl);
        this.model = model;
        this.enabled = enabled;
        this.anthropicVersion = anthropicVersion;
        this.userAgent = userAgent;
        this.disableThinking = disableThinking;
        this.thinkingHeadroomTokens = Math.max(0, thinkingHeadroomTokens);
    }

    @Override
    public String name() {
        return PROVIDER_NAME;
    }

    @Override
    public boolean isConfigured() {
        return enabled && !apiKey.isBlank();
    }

    @Override
    public String model() {
        return model;
    }

    @Override
    public AiCompletion complete(AiRequest request) {
        if (!isConfigured()) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.NOT_CONFIGURED,
                    "AgentRouter is not configured");
        }

        String url = baseUrl + AgentRouterConfig.MESSAGES_PATH;
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(buildBody(request), buildHeaders());

        long startedAt = System.currentTimeMillis();
        String rawResponse;
        try {
            rawResponse = restTemplate.postForObject(url, entity, String.class);
        } catch (HttpClientErrorException.TooManyRequests ex) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.RATE_LIMITED, 429,
                    "AgentRouter rate limited the request", ex);
        } catch (HttpServerErrorException ex) {
            // Includes the 503 an unknown model produces, so a mistyped AGENTROUTER_MODEL degrades to
            // the fallback instead of taking AI down.
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.SERVER_ERROR,
                    ex.getStatusCode().value(), "AgentRouter returned a server error", ex);
        } catch (HttpStatusCodeException ex) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.CLIENT_ERROR,
                    ex.getStatusCode().value(), "AgentRouter rejected the request", ex);
        } catch (ResourceAccessException ex) {
            throw new AiProviderCallException(PROVIDER_NAME, classifyTransport(ex),
                    "AgentRouter was unreachable", ex);
        } catch (RestClientException ex) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.NETWORK,
                    "AgentRouter request failed", ex);
        }

        long latencyMs = System.currentTimeMillis() - startedAt;

        if (rawResponse == null || rawResponse.isBlank()) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.EMPTY_RESPONSE,
                    "AgentRouter returned an empty body");
        }

        return new AiCompletion(extractText(rawResponse), PROVIDER_NAME, model, latencyMs);
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", anthropicVersion);
        // The router refuses a default HTTP client signature even with a valid key; see the class note.
        headers.set("user-agent", userAgent);
        return headers;
    }

    private Map<String, Object> buildBody(AiRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        // The caller's ceiling covers the answer; the headroom covers the thinking block we cannot
        // switch off, so a reply is never truncated to nothing before any text is emitted.
        body.put("max_tokens", request.maxTokens() + thinkingHeadroomTokens);
        body.put("temperature", request.temperature());
        body.put("messages", List.of(Map.of("role", "user", "content", request.prompt())));
        if (disableThinking) {
            // Accepted but, as observed, not currently honoured by the router. Sent anyway so the
            // saving applies the moment it is, and harmless in the meantime.
            body.put("thinking", Map.of("type", "disabled"));
        }
        return body;
    }

    /**
     * Flattens an Anthropic {@code content[]} block list to plain text.
     *
     * <p>Only {@code text} blocks contribute. {@code thinking} blocks are internal reasoning and must
     * never reach a student's chat bubble, and a reply consisting solely of them counts as empty so the
     * gateway can fall back rather than render a blank message.
     */
    private String extractText(String rawResponse) {
        JsonNode root;
        try {
            root = objectMapper.readTree(rawResponse);
        } catch (JsonProcessingException ex) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.MALFORMED_RESPONSE,
                    "AgentRouter returned unparseable JSON", ex);
        }

        // A 200 carrying an error envelope: treat as malformed rather than trusting it.
        if (root.hasNonNull("error")) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.MALFORMED_RESPONSE,
                    "AgentRouter returned an error envelope");
        }

        JsonNode content = root.path("content");
        if (!content.isArray()) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.MALFORMED_RESPONSE,
                    "AgentRouter response had no content array");
        }

        StringBuilder text = new StringBuilder();
        for (JsonNode block : content) {
            if ("text".equals(block.path("type").asText())) {
                text.append(block.path("text").asText(""));
            }
        }

        String result = text.toString().trim();
        if (result.isEmpty()) {
            String stopReason = root.path("stop_reason").asText("unknown");
            log.debug("AgentRouter produced no text block (stop_reason={})", stopReason);
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.EMPTY_RESPONSE,
                    "AgentRouter returned no text content (stop_reason=" + stopReason + ")");
        }
        return result;
    }

    /** Distinguishes "took too long" from "could not be reached" for the log line. */
    private AiFailureKind classifyTransport(ResourceAccessException ex) {
        for (Throwable cause = ex.getCause(); cause != null; cause = cause.getCause()) {
            if (cause instanceof SocketTimeoutException) {
                return AiFailureKind.TIMEOUT;
            }
            if (cause instanceof UnknownHostException || cause instanceof ConnectException) {
                return AiFailureKind.NETWORK;
            }
        }
        // Apache/HttpClient connect-timeout types differ across clients; fall back to a name check
        // rather than compiling against a specific HTTP client implementation.
        String causeName = ex.getCause() == null ? "" : ex.getCause().getClass().getSimpleName();
        return causeName.contains("Timeout") ? AiFailureKind.TIMEOUT : AiFailureKind.NETWORK;
    }

    /**
     * {@code ANTHROPIC_BASE_URL}-style values are commonly written with a trailing slash
     * ({@code https://agentrouter.org/}). Left as-is that produces {@code //v1/messages}, which the
     * router does not route.
     */
    private static String normaliseBaseUrl(String value) {
        String url = (value == null || value.isBlank()) ? "https://agentrouter.org" : value.trim();
        while (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        return url;
    }
}

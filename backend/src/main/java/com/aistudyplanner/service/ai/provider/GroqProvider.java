package com.aistudyplanner.service.ai.provider;

import com.aistudyplanner.config.GroqConfig;
import com.aistudyplanner.service.ai.AiCompletion;
import com.aistudyplanner.service.ai.AiFailureKind;
import com.aistudyplanner.service.ai.AiProvider;
import com.aistudyplanner.service.ai.AiProviderCallException;
import com.aistudyplanner.service.ai.AiRequest;
import com.aistudyplanner.util.Constants;
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
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * FALLBACK provider: the existing Groq deployment, unchanged in behaviour.
 *
 * <p>This is the transport that used to live inside {@code GroqService#callGroq}, moved out so it can
 * sit behind the same {@link AiProvider} interface as AgentRouter. Everything that made it work is kept
 * exactly as it was, deliberately:
 *
 * <ul>
 *   <li>the OpenAI-compatible request body and {@code Authorization: Bearer} header;
 *   <li>the per-minute self-imposed rate limiter;
 *   <li>the single 2.5s retry on a 429 — one retry, not a loop;
 *   <li>the {@code choices} parse with the legacy {@code candidates} shape as a second chance;
 *   <li>the {@code <think>…</think>} strip, which some Groq-hosted models emit inline.
 * </ul>
 *
 * <p>The only substantive change is the exception type: provider faults now carry an
 * {@link AiFailureKind} so the gateway can log them precisely and decide about fallback, rather than
 * every cause collapsing into one opaque error.
 */
@Component
@Order(20)
public class GroqProvider implements AiProvider {

    public static final String PROVIDER_NAME = "Groq";

    private static final String DEFAULT_MODEL = "openai/gpt-oss-20b";

    private static final Logger log = LoggerFactory.getLogger(GroqProvider.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final boolean enabled;

    /**
     * Minute-bucketed request counter. Kept provider-local: now that Groq is only reached when the
     * primary could not answer, this counts actual Groq traffic rather than all AI traffic, which is
     * what a Groq-specific quota should have measured all along.
     */
    private final ConcurrentHashMap<Long, AtomicInteger> rateLimiter = new ConcurrentHashMap<>();

    public GroqProvider(
            @Qualifier("groqRestTemplate") RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @Value("${groq.api-key:}") String apiKey,
            @Value("${groq.model:openai/gpt-oss-20b}") String model,
            @Value("${groq.enabled:true}") boolean enabled) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = (model == null || model.isBlank()) ? DEFAULT_MODEL : model;
        this.enabled = enabled;
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
                    "Groq is not configured");
        }
        checkRateLimit();
        long startedAt = System.currentTimeMillis();
        String text = send(request, true);
        return new AiCompletion(text, PROVIDER_NAME, model, System.currentTimeMillis() - startedAt);
    }

    private String send(AiRequest request, boolean allowRetry) {
        String rawResponse;
        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(buildBody(request), buildHeaders());
            rawResponse = restTemplate.postForObject(GroqConfig.GROQ_API_URL, entity, String.class);
        } catch (HttpClientErrorException.TooManyRequests ex) {
            if (allowRetry) {
                log.warn("AI provider retry: Groq rate limited, waiting 2.5s for a single retry");
                try {
                    Thread.sleep(2500);
                    return send(request, false);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.RATE_LIMITED, 429,
                    "Groq rate limited the request", ex);
        } catch (HttpServerErrorException ex) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.SERVER_ERROR,
                    ex.getStatusCode().value(), "Groq returned a server error", ex);
        } catch (HttpStatusCodeException ex) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.CLIENT_ERROR,
                    ex.getStatusCode().value(), "Groq rejected the request", ex);
        } catch (ResourceAccessException ex) {
            throw new AiProviderCallException(PROVIDER_NAME, classifyTransport(ex),
                    "Groq was unreachable", ex);
        } catch (RestClientException ex) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.NETWORK,
                    "Groq request failed", ex);
        }

        if (rawResponse == null || rawResponse.isBlank()) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.EMPTY_RESPONSE,
                    "Groq returned an empty body");
        }
        return extractText(rawResponse);
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        return headers;
    }

    private Map<String, Object> buildBody(AiRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);

        Map<String, Object> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", request.prompt());

        body.put("messages", List.of(message));
        body.put("temperature", request.temperature());
        body.put("max_tokens", request.maxTokens());
        return body;
    }

    /** OpenAI-shaped {@code choices}, with the legacy {@code candidates} envelope as a second chance. */
    private String extractText(String rawResponse) {
        JsonNode root;
        try {
            root = objectMapper.readTree(rawResponse);
        } catch (JsonProcessingException ex) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.MALFORMED_RESPONSE,
                    "Groq returned unparseable JSON", ex);
        }

        if (root.has("choices") && root.path("choices").size() > 0) {
            String content = root.path("choices").get(0).path("message").path("content").asText();
            if (!content.isBlank()) {
                return cleanResponse(content);
            }
        }
        if (root.has("candidates") && root.path("candidates").size() > 0) {
            String content = root.path("candidates").get(0).path("content")
                    .path("parts").get(0).path("text").asText();
            if (!content.isBlank()) {
                return cleanResponse(content);
            }
        }
        throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.MALFORMED_RESPONSE,
                "Groq returned a malformed response");
    }

    /** Some Groq-hosted models wrap internal reasoning in {@code <think>} tags; students must not see it. */
    private String cleanResponse(String content) {
        if (content == null) {
            return "";
        }
        String cleaned = content.replaceAll("(?s)<think>.*?</think>", "").trim();
        return cleaned.isBlank() ? content.trim() : cleaned;
    }

    private void checkRateLimit() {
        long currentMinute = Instant.now().getEpochSecond() / 60;
        rateLimiter.putIfAbsent(currentMinute, new AtomicInteger(0));

        if (rateLimiter.get(currentMinute).incrementAndGet() > Constants.GROQ_RATE_LIMIT_PER_MINUTE) {
            throw new AiProviderCallException(PROVIDER_NAME, AiFailureKind.RATE_LIMITED,
                    "Groq local rate limit exceeded (" + Constants.GROQ_RATE_LIMIT_PER_MINUTE
                            + " requests per minute)");
        }

        rateLimiter.keySet().removeIf(minute -> minute < currentMinute - 1);
    }

    private AiFailureKind classifyTransport(ResourceAccessException ex) {
        for (Throwable cause = ex.getCause(); cause != null; cause = cause.getCause()) {
            if (cause instanceof SocketTimeoutException) {
                return AiFailureKind.TIMEOUT;
            }
            if (cause instanceof UnknownHostException || cause instanceof ConnectException) {
                return AiFailureKind.NETWORK;
            }
        }
        String causeName = ex.getCause() == null ? "" : ex.getCause().getClass().getSimpleName();
        return causeName.contains("Timeout") ? AiFailureKind.TIMEOUT : AiFailureKind.NETWORK;
    }
}

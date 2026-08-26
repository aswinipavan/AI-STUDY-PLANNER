package com.aistudyplanner.service.ai;

import com.aistudyplanner.exception.AiProviderException;
import com.aistudyplanner.exception.RateLimitException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.AnnotationAwareOrderComparator;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The single entry point every AI feature uses to reach a model.
 *
 * <p>Providers are attempted strictly in order — AgentRouter (Claude) first, Groq second — and the
 * first usable completion wins. The chain is walked exactly once per call: one attempt per provider,
 * no retry loop at this level, so a request can never fan out into duplicate calls or spin.
 *
 * <p>What the chain does <em>not</em> catch is just as important as what it does. Only
 * {@link AiProviderCallException} — a fault a provider raised about its own transport, status, or body
 * — advances the chain. An ordinary runtime exception from our own code propagates immediately and
 * untouched, so a bug in prompt assembly surfaces as a bug instead of quietly consuming quota at
 * every provider in turn.
 */
@Service
public class AiProviderGateway {

    private static final Logger log = LoggerFactory.getLogger(AiProviderGateway.class);

    private static final String NOT_CONFIGURED_MESSAGE = "AI is not configured on the backend.";

    private static final String ALL_FAILED_MESSAGE = "AI service temporarily unavailable";

    private static final String RATE_LIMITED_MESSAGE =
            "AI is busy right now. Please wait a moment and try again.";

    private final List<AiProvider> providers;

    public AiProviderGateway(List<AiProvider> providers) {
        // Spring already hands the list over in @Order sequence; sorting again makes the guarantee the
        // gateway's own rather than the container's, so the primary cannot be demoted by a change in
        // bean discovery order. Mocks carry no @Order and keep the order a test passes them in.
        List<AiProvider> ordered = new ArrayList<>(providers);
        AnnotationAwareOrderComparator.sort(ordered);
        this.providers = List.copyOf(ordered);

        log.info("AI provider chain: {}", this.providers.stream()
                .map(p -> p.name() + (p.isConfigured() ? "" : " (not configured)"))
                .collect(Collectors.joining(" -> ")));
    }

    /**
     * Run a completion against the provider chain.
     *
     * @throws RateLimitException  429 — every configured provider was rate limited. Preserves the
     *                             status the API already returned when Groq alone was throttled.
     * @throws AiProviderException 503 with a fixed message for every other exhausted-chain case.
     */
    public AiCompletion complete(AiRequest request) {
        Set<AiFailureKind> failures = EnumSet.noneOf(AiFailureKind.class);
        boolean anyAttempted = false;
        boolean fallbackStage = false;

        for (AiProvider provider : providers) {
            if (!provider.isConfigured()) {
                // Not an error: an install that only ever sets GROQ_API_KEY lands here on every call and
                // must stay quiet, so this is debug rather than warn.
                log.debug("AI provider skipped: {} (not configured)", provider.name());
                continue;
            }

            if (fallbackStage) {
                log.warn("AI provider fallback: {}", provider.name());
            }
            log.info("AI provider attempt: {} (purpose={})", provider.name(), request.purpose());
            anyAttempted = true;

            try {
                AiCompletion completion = provider.complete(request);
                log.info("AI provider success: {} model={} in {}ms",
                        completion.provider(), completion.model(), completion.latencyMs());
                return completion;
            } catch (AiProviderCallException ex) {
                failures.add(ex.getKind());
                // describe() is deliberately narrow — a status code or a failure kind. The prompt, the
                // response body, the API key and the Authorization header are never logged.
                log.warn("AI provider failure: {} {}", provider.name(), ex.describe());
                if (log.isDebugEnabled()) {
                    log.debug("AI provider failure detail: {} {} - {}",
                            provider.name(), ex.describe(), ex.getMessage());
                }
                if (!ex.getKind().shouldFallback()) {
                    break;
                }
                fallbackStage = true;
            }
        }

        if (!anyAttempted) {
            log.error("AI request rejected: no AI provider is configured");
            throw new AiProviderException(NOT_CONFIGURED_MESSAGE);
        }

        // A chain that failed only because of throttling keeps returning 429, which is the status this
        // API has always used for a rate-limited AI call and the one a client can sensibly retry on.
        if (!failures.isEmpty() && failures.equals(EnumSet.of(AiFailureKind.RATE_LIMITED))) {
            log.error("AI request failed: all providers rate limited");
            throw new RateLimitException(RATE_LIMITED_MESSAGE);
        }

        log.error("AI request failed: all providers exhausted, kinds={}", failures);
        throw new AiProviderException(ALL_FAILED_MESSAGE);
    }

    /** True when at least one provider in the chain could be attempted. Used for diagnostics. */
    public boolean isAnyProviderConfigured() {
        return providers.stream().anyMatch(AiProvider::isConfigured);
    }

    /** Provider names in attempt order, for diagnostics and tests. Never includes credentials. */
    public List<String> providerOrder() {
        return providers.stream().map(AiProvider::name).toList();
    }
}

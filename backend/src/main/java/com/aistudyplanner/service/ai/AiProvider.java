package com.aistudyplanner.service.ai;

/**
 * A single AI backend the application can talk to.
 *
 * <p>Implementations are thin: translate an {@link AiRequest} onto the provider's wire format, send
 * it, parse the reply into an {@link AiCompletion}. No prompt construction, no student context
 * assembly, no feature logic — all of that stays above this layer so both providers receive exactly
 * the same context and can be swapped without changing a single answer's inputs.
 *
 * <p>Ordering is decided by {@link org.springframework.core.annotation.Order} on each bean and read
 * by {@link AiProviderGateway}: AgentRouter is primary, Groq is the fallback.
 */
public interface AiProvider {

    /** Stable, log-friendly name ("AgentRouter", "Groq"). Appears in provider log lines. */
    String name();

    /**
     * Whether this provider has the configuration it needs to be attempted at all. A provider with no
     * API key returns {@code false} and is skipped by the gateway, so a deployment that never sets
     * {@code AGENTROUTER_API_KEY} keeps running on Groq exactly as it did before this layer existed.
     */
    boolean isConfigured();

    /** Model identifier this provider will use, for logs and diagnostics. */
    String model();

    /**
     * Send the request and return the completion.
     *
     * @throws AiProviderCallException for any provider-side fault — transport, HTTP status, or an
     *                                unusable body. The gateway treats this, and only this, as a
     *                                signal to try the next provider.
     */
    AiCompletion complete(AiRequest request);
}

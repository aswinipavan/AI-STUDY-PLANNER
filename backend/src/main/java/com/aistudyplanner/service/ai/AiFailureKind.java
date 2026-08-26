package com.aistudyplanner.service.ai;

/**
 * Why a provider call failed, classified so the gateway can decide whether to fall back and whether
 * the eventual user-facing error should be a 429 or a 503.
 *
 * <p>Every kind here is a <em>provider</em> fault: a transport problem, an HTTP status the provider
 * chose to return, or a body it sent that we could not use. Faults in our own code (a blank prompt,
 * a null argument, a bad cast) are deliberately absent — they are never wrapped in
 * {@link AiProviderCallException} and so never trigger a fallback, because retrying a second provider
 * with the same broken input would just burn quota and hide the bug.
 */
public enum AiFailureKind {

    /** No API key configured. The provider is skipped silently rather than attempted. */
    NOT_CONFIGURED(false),

    /** Connect or read timeout. */
    TIMEOUT(true),

    /** DNS failure, connection refused, TLS error, host unreachable. */
    NETWORK(true),

    /** HTTP 429. */
    RATE_LIMITED(true),

    /** HTTP 5xx, including AgentRouter's 503 for an unknown model. */
    SERVER_ERROR(true),

    /**
     * HTTP 4xx other than 429 — a rejected key, an unsupported parameter, a malformed request as the
     * provider sees it. Still fallback-eligible: the brief's carve-out is for bugs in <em>our</em>
     * logic, and a status line is the provider's own response about its own state. AgentRouter's 401
     * {@code unauthorized_client_error} is exactly this case, and a deployment where the primary key
     * has been revoked must keep answering students on Groq rather than fail hard.
     */
    CLIENT_ERROR(true),

    /** HTTP 200 with a body that does not match the provider's documented shape. */
    MALFORMED_RESPONSE(true),

    /**
     * HTTP 200, well-formed, but carrying no usable text. Observed live on AgentRouter when the token
     * budget is consumed entirely by a {@code thinking} block ({@code stop_reason: "max_tokens"},
     * zero text blocks).
     */
    EMPTY_RESPONSE(true);

    private final boolean shouldFallback;

    AiFailureKind(boolean shouldFallback) {
        this.shouldFallback = shouldFallback;
    }

    /** Whether the gateway should try the next provider after this failure. */
    public boolean shouldFallback() {
        return shouldFallback;
    }
}

package com.aistudyplanner.service.ai;

/**
 * Internal, provider-scoped failure. Thrown by an {@link AiProvider}, caught by
 * {@link AiProviderGateway}, and never allowed to escape to a controller.
 *
 * <p>This type is the fallback trigger. The gateway falls back <em>only</em> when it catches this
 * exception, which is what implements the brief's rule that a programming or validation bug in our
 * own code must not cascade into a second provider call: those throw ordinary runtime exceptions,
 * which pass straight through the gateway untouched.
 */
public class AiProviderCallException extends RuntimeException {

    private final AiFailureKind kind;
    private final String providerName;

    /** HTTP status the provider returned, or 0 when the failure happened below HTTP. */
    private final int httpStatus;

    public AiProviderCallException(String providerName, AiFailureKind kind, String message) {
        this(providerName, kind, 0, message, null);
    }

    public AiProviderCallException(String providerName, AiFailureKind kind, String message, Throwable cause) {
        this(providerName, kind, 0, message, cause);
    }

    public AiProviderCallException(String providerName, AiFailureKind kind, int httpStatus,
                                  String message, Throwable cause) {
        super(message, cause);
        this.providerName = providerName;
        this.kind = kind;
        this.httpStatus = httpStatus;
    }

    public AiFailureKind getKind() {
        return kind;
    }

    public String getProviderName() {
        return providerName;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    /**
     * Short, secret-free description for the provider log line — e.g. {@code "HTTP 429"} or
     * {@code "TIMEOUT"}. Never includes the prompt, the response body, or any header.
     */
    public String describe() {
        return httpStatus > 0 ? "HTTP " + httpStatus : kind.name();
    }
}

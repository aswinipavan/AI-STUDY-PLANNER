package com.aistudyplanner.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * One application-level AI failure, raised when every configured provider has been tried and none
 * could answer.
 *
 * <p>The message is deliberately generic and fixed. Which provider failed, with what status, and why
 * is recorded in the server log by {@link com.aistudyplanner.service.ai.AiProviderGateway}; none of it
 * reaches the student, so no provider internals leak through the API.
 *
 * <p>This replaces the old Groq-specific exception and maps to the same HTTP 503 with the same
 * {@code "AI service temporarily unavailable"} body, so the response an existing client sees when AI is
 * down is byte-identical to before.
 */
@ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
public class AiProviderException extends RuntimeException {

    public AiProviderException(String message) {
        super(message);
    }

    public AiProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}

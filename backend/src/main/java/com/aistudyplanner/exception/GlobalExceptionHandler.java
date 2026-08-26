package com.aistudyplanner.exception;

import com.aistudyplanner.model.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex) {
        return buildErrorResponse(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler({UnauthorizedException.class, FirebaseTokenException.class})
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(RuntimeException ex) {
        return buildErrorResponse(ex.getMessage(), HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AlreadySubscribedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAlreadySubscribed(AlreadySubscribedException ex) {
        return buildErrorResponse(ex.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(PaymentVerificationException.class)
    public ResponseEntity<ApiResponse<Void>> handlePaymentVerification(PaymentVerificationException ex) {
        return buildErrorResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ApiResponse<Void>> handleRateLimit(RateLimitException ex) {
        return buildErrorResponse(ex.getMessage(), HttpStatus.TOO_MANY_REQUESTS);
    }

    @ExceptionHandler(InvalidMarksException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidMarks(InvalidMarksException ex) {
        return buildErrorResponse(ex.getMessage(), HttpStatus.UNPROCESSABLE_ENTITY);
    }

    /**
     * One consistent, provider-agnostic AI failure. Raised only once every configured AI provider has
     * been tried and none could answer. Which provider failed and why is in the server log, not in this
     * response — the student sees the same message whether AgentRouter, Groq, or both went down.
     */
    @ExceptionHandler(AiProviderException.class)
    public ResponseEntity<ApiResponse<Void>> handleAiProvider(AiProviderException ex) {
        log.error("AI provider error: {}", ex.getMessage());
        return buildErrorResponse("AI service temporarily unavailable", HttpStatus.SERVICE_UNAVAILABLE);
    }

    /**
     * CRITICAL FIX: IllegalArgumentException was previously unhandled, causing HTTP 500.
     * Now correctly maps to HTTP 400 Bad Request.
     * Fixes: exam creation date validation, subject ownership checks, timetable validation.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request - illegal argument: {}", ex.getMessage());
        return buildErrorResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        ApiResponse<Map<String, String>> response = ApiResponse.error(errors, "Validation failed");
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * A required request header being absent is a client error (a malformed request), not a server
     * fault. Without this it fell through to the generic handler below and surfaced as HTTP 500 — e.g.
     * {@code POST /api/auth/refresh} with no {@code Firebase-Token} header. Map it to 400 instead.
     */
    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingRequestHeader(MissingRequestHeaderException ex) {
        log.warn("Bad request - missing header: {}", ex.getHeaderName());
        return buildErrorResponse("Required request header '" + ex.getHeaderName() + "' is missing.",
                HttpStatus.BAD_REQUEST);
    }

    /**
     * A request that matches no controller mapping (e.g. an unknown path) must surface as a
     * proper 404 rather than being swallowed by the generic handler below and reported as 500.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException ex) {
        log.warn("No handler for resource: {}", ex.getResourcePath());
        return buildErrorResponse("The requested resource was not found.", HttpStatus.NOT_FOUND);
    }

    /**
     * Same reasoning as above for the sibling case: a path that exists but was called with the
     * wrong HTTP method is a client error (405), not an internal fault. Letting it reach the
     * generic handler logged a full stack trace and told the caller "internal server error",
     * which hides the actual mistake.
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        log.warn("Unsupported method {} — supported: {}", ex.getMethod(), ex.getSupportedHttpMethods());
        return buildErrorResponse(
                "HTTP method " + ex.getMethod() + " is not supported for this endpoint.",
                HttpStatus.METHOD_NOT_ALLOWED);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("An unexpected error occurred", ex);
        return buildErrorResponse("An internal server error occurred", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private ResponseEntity<ApiResponse<Void>> buildErrorResponse(String message, HttpStatus status) {
        return new ResponseEntity<>(ApiResponse.error(null, message), status);
    }
}

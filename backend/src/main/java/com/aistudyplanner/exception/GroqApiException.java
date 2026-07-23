package com.aistudyplanner.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
public class GroqApiException extends RuntimeException {
    public GroqApiException(String message, Throwable cause) {
        super(message, cause);
    }
}

package com.aistudyplanner.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class InvalidMarksException extends RuntimeException {
    public InvalidMarksException(String message) {
        super(message);
    }
}

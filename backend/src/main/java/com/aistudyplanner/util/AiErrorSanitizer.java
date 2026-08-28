package com.aistudyplanner.util;

import java.util.regex.Pattern;

/**
 * Utility for sanitizing sensitive credentials from diagnostic logs, stack traces,
 * and user inputs before prompt assembly and AI model submission.
 */
public final class AiErrorSanitizer {

    private static final Pattern JWT_PATTERN = Pattern.compile("eyJ[a-zA-Z0-9_-]{10,}\\.eyJ[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}");
    private static final Pattern AUTH_HEADER_PATTERN = Pattern.compile("(?i)(authorization:\\s*(?:bearer\\s+)?)[a-zA-Z0-9._\\-+/=]+");
    private static final Pattern COOKIE_HEADER_PATTERN = Pattern.compile("(?i)(cookie:\\s*)[^\r\n]+");
    private static final Pattern KEY_VALUE_SECRET_PATTERN = Pattern.compile("(?i)(api[_-]?key|jwt[_-]?secret|password|access[_-]?token|secret[_-]?key)\\s*[:=]\\s*[\"']?[a-zA-Z0-9._\\-+/=]{8,}[\"']?");

    private AiErrorSanitizer() {
        // utility class
    }

    /**
     * Redacts sensitive tokens, credentials, cookies, and secret keys from input strings.
     * Replaces them with "[redacted]" to ensure zero credential leakage.
     */
    public static String redactSensitiveData(String input) {
        if (input == null || input.isBlank()) {
            return input;
        }

        String sanitized = input;
        sanitized = JWT_PATTERN.matcher(sanitized).replaceAll("[redacted-jwt]");
        sanitized = AUTH_HEADER_PATTERN.matcher(sanitized).replaceAll("$1[redacted]");
        sanitized = COOKIE_HEADER_PATTERN.matcher(sanitized).replaceAll("$1[redacted]");
        sanitized = KEY_VALUE_SECRET_PATTERN.matcher(sanitized).replaceAll("$1: [redacted]");

        return sanitized;
    }

    /**
     * Checks if the user message contains error logs, stack traces, HTTP errors, or CI diagnostics.
     */
    public static boolean isDiagnosticOrErrorInput(String input) {
        if (input == null || input.isBlank()) {
            return false;
        }
        String lower = input.toLowerCase();
        return lower.contains("error") || lower.contains("exception") || lower.contains("caused by:")
                || lower.contains("stack trace") || lower.contains("http 4") || lower.contains("http 5")
                || lower.contains("status 40") || lower.contains("status 50") || lower.contains("failed")
                || lower.contains("exit code") || lower.contains("nullpointer") || lower.contains("sqlstate")
                || lower.contains("syntaxerror") || lower.contains("typeerror") || lower.contains("github actions");
    }
}
package com.aistudyplanner.service.ai;

/**
 * One provider-neutral AI completion request.
 *
 * <p>The prompt is fully built before it gets here. All of the application's context assembly —
 * student profile, marks, weak/strong subjects, exams and deadlines, uploaded materials, extracted
 * topics/chapters/keywords, document text, chat history, timetable, study preferences, completed and
 * missed sessions — stays where it already lives ({@code GroqService}'s prompt methods and
 * {@code AiAssistantService}'s context builders). A provider only translates this object onto its
 * own wire format and parses the reply back, so both providers see byte-identical context and
 * swapping providers can never change what the model was told.
 *
 * @param prompt      the complete prompt, already assembled. Never blank.
 * @param temperature sampling temperature; both providers accept the same 0..2 range.
 * @param maxTokens   upper bound on generated tokens.
 * @param purpose     short, non-sensitive label ("chat", "summarize", "categorize", …) used only in
 *                    provider logs so an operator can tell which feature a call came from without
 *                    the prompt body ever being written to a log file.
 */
public record AiRequest(String prompt, double temperature, int maxTokens, String purpose) {

    public static final double DEFAULT_TEMPERATURE = 0.7;

    /**
     * Matches the token ceiling the application has always used for Groq, so migrating a call site
     * to the abstraction cannot change response length. Providers may raise their own ceiling
     * (AgentRouter does — see {@code AgentRouterProvider}) but never below this.
     */
    public static final int DEFAULT_MAX_TOKENS = 1000;

    public AiRequest {
        // A blank prompt is a bug in our own code, not a provider fault. Failing loudly here — before
        // any provider is contacted — is what keeps it out of the gateway's fallback path: the
        // gateway only falls back on AiProviderCallException, so this escapes untouched instead of
        // burning a request against every provider in turn.
        if (prompt == null || prompt.isBlank()) {
            throw new IllegalArgumentException("AI prompt must not be blank");
        }
        if (maxTokens <= 0) {
            throw new IllegalArgumentException("AI maxTokens must be positive, got " + maxTokens);
        }
        if (purpose == null || purpose.isBlank()) {
            throw new IllegalArgumentException("AI request purpose must not be blank");
        }
    }

    /** The common case: application defaults for temperature and token ceiling. */
    public static AiRequest of(String prompt, String purpose) {
        return new AiRequest(prompt, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, purpose);
    }
}

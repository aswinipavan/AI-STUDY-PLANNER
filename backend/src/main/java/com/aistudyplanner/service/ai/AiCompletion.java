package com.aistudyplanner.service.ai;

/**
 * The normalised result of an AI completion.
 *
 * <p>Provider-specific response envelopes (Anthropic's {@code content[]} block list, Groq's
 * OpenAI-style {@code choices[]}) are flattened to plain text inside each provider, so nothing above
 * this layer — service, controller, DTO, frontend, mobile — can tell which provider answered.
 *
 * <p>{@code provider} and {@code model} exist for logs and diagnostics only. They are deliberately
 * not carried into any response DTO: the student's chat bubble looks the same either way.
 */
public record AiCompletion(String text, String provider, String model, long latencyMs) {
}

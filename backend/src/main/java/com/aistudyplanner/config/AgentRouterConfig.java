package com.aistudyplanner.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * HTTP client for the AgentRouter (Anthropic Messages-compatible) provider.
 *
 * <p>Separate from {@link GroqConfig}'s template on purpose: the primary provider needs a
 * <em>shorter</em> read timeout than the fallback, so that a hung primary hands over to Groq quickly and
 * the student waits once rather than twice over.
 *
 * <p>The 22s default is measured, and two independent limits happen to agree on it.
 *
 * <p>From below: real app traffic saw the primary answer successfully at 8.0s, 13.3s, 15.7s and 16.7s.
 * An earlier 15s ceiling was discarding the last two — perfectly good answers thrown away to pay for a
 * fallback the request did not need — so the ceiling has to clear roughly 17s to be worth having.
 *
 * <p>From above: prompts asking for long structured output never produce text at this token budget at all.
 * The model spends the entire budget on reasoning and returns thinking blocks only, the quickest such case
 * measured at 25.1s. Waiting past ~25s therefore buys nothing: the reply arrives and is still unusable, so
 * the request falls through to Groq regardless, just later.
 *
 * <p>22s sits between those, and also keeps the worst-case chain (22s here, then Groq's 30s ceiling plus
 * one 2.5s retry) at 54.5s — inside the tightest client budget, which is the mobile app's 60s AI timeout.
 */
@Configuration
public class AgentRouterConfig {

    /** Path appended to the configured base URL. Anthropic Messages API, not the OpenAI surface. */
    public static final String MESSAGES_PATH = "/v1/messages";

    @Bean
    public RestTemplate agentRouterRestTemplate(
            RestTemplateBuilder builder,
            @Value("${agentrouter.connect-timeout-seconds:5}") int connectTimeoutSeconds,
            @Value("${agentrouter.read-timeout-seconds:22}") int readTimeoutSeconds) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(connectTimeoutSeconds))
                .setReadTimeout(Duration.ofSeconds(readTimeoutSeconds))
                .build();
    }
}

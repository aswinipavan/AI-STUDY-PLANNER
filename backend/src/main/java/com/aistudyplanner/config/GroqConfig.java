package com.aistudyplanner.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class GroqConfig {

    // Actual Groq API endpoint (not Google Gemini)
    public static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    @Bean
    public RestTemplate groqRestTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(30))
                .build();
    }
}

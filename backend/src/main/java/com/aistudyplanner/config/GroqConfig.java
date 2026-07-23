package com.aistudyplanner.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class GroqConfig {

    public static final String GROQ_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/groq-1.5-flash:generateContent";

    @Bean
    public RestTemplate groqRestTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(30))
                .build();
    }
}

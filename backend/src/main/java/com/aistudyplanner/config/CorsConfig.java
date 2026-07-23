package com.aistudyplanner.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@Slf4j
public class CorsConfig {

    @Value("${allowed.origins:*}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        String allowedOriginsEnv = allowedOrigins;
        List<String> origins = Arrays.asList(allowedOriginsEnv.split(","));
        
        // Security: Only allow * in non-production or reject it entirely
        if (origins.contains("*")) {
            if ("prod".equalsIgnoreCase(System.getenv("ENVIRONMENT"))) {
                log.warn("WARNING: CORS wildcard (*) detected in production! Rejecting for security.");
                configuration.setAllowedOrigins(List.of("https://your-production-frontend.com"));
            } else {
                configuration.setAllowedOriginPatterns(List.of("*"));
                log.warn("CORS wildcard (*) configured in non-production environment");
            }
        } else {
            configuration.setAllowedOrigins(origins);
            log.info("CORS configured for origins: {}", String.join(", ", origins));
        }
        
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

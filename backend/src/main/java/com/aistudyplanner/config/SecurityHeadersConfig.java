package com.aistudyplanner.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Security headers configuration to prevent XSS, Clickjacking, and other attacks
 */
@Configuration
public class SecurityHeadersConfig {

    @Bean
    public OncePerRequestFilter securityHeadersFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) 
                    throws ServletException, IOException {
                
                // HSTS: Force HTTPS for 1 year (including subdomains)
                response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
                
                // X-Frame-Options: Prevent clickjacking
                response.setHeader("X-Frame-Options", "DENY");
                
                // X-Content-Type-Options: Prevent MIME type sniffing
                response.setHeader("X-Content-Type-Options", "nosniff");
                
                // X-XSS-Protection: Enable XSS protection in older browsers
                response.setHeader("X-XSS-Protection", "1; mode=block");
                
                // Content-Security-Policy: Restrict content sources
                response.setHeader("Content-Security-Policy", 
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-inline'; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data: https:; " +
                    "font-src 'self'; " +
                    "connect-src 'self' https:; " +
                    "frame-ancestors 'none'");
                
                // Referrer-Policy: Control referrer information
                response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
                
                // Permissions-Policy: Restrict browser features
                response.setHeader("Permissions-Policy", 
                    "geolocation=(), microphone=(), camera=(), payment=(), usb=()");
                
                filterChain.doFilter(request, response);
            }
        };
    }
}

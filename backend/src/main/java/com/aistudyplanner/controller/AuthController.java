package com.aistudyplanner.controller;

import com.aistudyplanner.config.RateLimitingConfig;
import com.aistudyplanner.exception.RateLimitException;
import com.aistudyplanner.model.dto.request.LoginRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.AuthResponse;
import com.aistudyplanner.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Auth", description = "Authentication APIs")
public class AuthController {

    private final AuthService authService;
    private final RateLimitingConfig rateLimitingConfig;

    @PostMapping("/login")
    @Operation(summary = "Login using Firebase Token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        
        // Rate limiting: max 10 login attempts per minute per IP
        String clientIp = getClientIp(httpRequest);
        if (!rateLimitingConfig.allowRequest("login:" + clientIp)) {
            log.warn("Login rate limit exceeded for IP: {}", clientIp);
            throw new RateLimitException("Too many login attempts. Please try again later.");
        }
        
        log.info("Received login request from IP: {}", clientIp);
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh JWT Token")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @RequestHeader("Firebase-Token") String firebaseToken) {
        log.info("Received refresh token request");
        AuthResponse response = authService.refreshToken(firebaseToken);
        return ResponseEntity.ok(ApiResponse.success(response, "Token refreshed successfully"));
    }

    /**
     * Extract client IP from request headers (handles X-Forwarded-For)
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}


package com.aistudyplanner.controller;

import com.aistudyplanner.config.RateLimitingConfig;
import com.aistudyplanner.model.dto.request.LoginRequest;
import com.aistudyplanner.model.dto.response.AuthResponse;
import com.aistudyplanner.service.AuthService;
import com.aistudyplanner.security.JwtTokenProvider;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.config.SecurityConfig;
import com.aistudyplanner.config.SecurityHeadersConfig;
import com.aistudyplanner.security.FirebaseTokenFilter;
import com.google.firebase.auth.FirebaseAuth;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, SecurityHeadersConfig.class, FirebaseTokenFilter.class})
@DisplayName("Auth Controller Unit Tests")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private RateLimitingConfig rateLimitingConfig;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private StudentRepository studentRepository;

    @MockBean
    private FirebaseAuth firebaseAuth;

    private LoginRequest validLoginRequest;
    private AuthResponse mockAuthResponse;

    @BeforeEach
    void setUp() {
        validLoginRequest = LoginRequest.builder()
                .firebaseToken("valid.firebase.token")
                .build();

        mockAuthResponse = AuthResponse.builder()
                .token("generated.jwt.token")
                .isNewUser(false)
                .build();

        lenient().when(rateLimitingConfig.allowRequest(anyString())).thenReturn(true);
    }

    @Test
    @DisplayName("Should login successfully with valid Firebase token")
    void testLoginSuccess() throws Exception {
        when(authService.login(any(LoginRequest.class))).thenReturn(mockAuthResponse);

        mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validLoginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.data.token").value("generated.jwt.token"));

        verify(authService, times(1)).login(any(LoginRequest.class));
    }

    @Test
    @DisplayName("Should reject login with empty Firebase token")
    void testLoginWithEmptyToken() throws Exception {
        LoginRequest invalidRequest = LoginRequest.builder().firebaseToken("").build();

        mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verify(authService, never()).login(any());
    }

    @Test
    @DisplayName("Should enforce rate limiting on login attempts")
    void testLoginRateLimiting() throws Exception {
        when(rateLimitingConfig.allowRequest(anyString())).thenReturn(false);

        mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validLoginRequest)))
                .andExpect(status().isTooManyRequests());

        verify(authService, never()).login(any());
    }

    @Test
    @DisplayName("Should refresh token successfully")
    void testRefreshTokenSuccess() throws Exception {
        when(authService.refreshToken("valid.firebase.token")).thenReturn(mockAuthResponse);

        mockMvc.perform(post("/api/auth/refresh")
                .with(csrf())
                .header("Firebase-Token", "valid.firebase.token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("generated.jwt.token"));

        verify(authService, times(1)).refreshToken("valid.firebase.token");
    }

    @Test
    @DisplayName("Should reject refresh with a missing Firebase-Token header as 400, not 500")
    void testRefreshMissingHeaderIsBadRequest() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verify(authService, never()).refreshToken(anyString());
    }
}

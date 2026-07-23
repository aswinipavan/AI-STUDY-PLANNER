package com.aistudyplanner.security;

import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.StudentRepository;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Firebase Token Filter Tests")
class FirebaseTokenFilterTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private FirebaseTokenFilter firebaseTokenFilter;

    private Student testStudent;
    private UUID testStudentId;
    private String testFirebaseUid;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        testStudentId = UUID.randomUUID();
        testFirebaseUid = "firebase-uid-123";
        testStudent = Student.builder()
                .id(testStudentId)
                .firebaseUid(testFirebaseUid)
                .fullName("Test Student")
                .email("test@example.com")
                .build();
        
        // Use lenient mode to avoid unnecessary stubbing warnings
        lenient().when(jwtTokenProvider.validateToken(anyString())).thenReturn(false);
        lenient().when(studentRepository.findById(any())).thenReturn(Optional.empty());
        lenient().when(studentRepository.findByFirebaseUid(anyString())).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("Should skip filter for login endpoint")
    void shouldSkipFilterForLoginEndpoint() throws ServletException, IOException {
        // Arrange
        when(request.getServletPath()).thenReturn("/api/auth/login");

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtTokenProvider);
        verifyNoInteractions(studentRepository);
    }

    @Test
    @DisplayName("Should skip filter for health check endpoint")
    void shouldSkipFilterForHealthCheckEndpoint() throws ServletException, IOException {
        // Arrange
        when(request.getServletPath()).thenReturn("/actuator/health");

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtTokenProvider);
        verifyNoInteractions(studentRepository);
    }

    @Test
    @DisplayName("Should skip filter for Swagger UI")
    void shouldSkipFilterForSwaggerUI() throws ServletException, IOException {
        // Arrange
        when(request.getServletPath()).thenReturn("/swagger-ui/index.html");

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(jwtTokenProvider);
        verifyNoInteractions(studentRepository);
    }

    @Test
    @DisplayName("Should process request without Authorization header")
    void shouldProcessRequestWithoutAuthorizationHeader() throws ServletException, IOException {
        // Arrange
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn(null);

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Should process request with empty Authorization header")
    void shouldProcessRequestWithEmptyAuthorizationHeader() throws ServletException, IOException {
        // Arrange
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("");

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Should process request with invalid Bearer token format")
    void shouldProcessRequestWithInvalidBearerFormat() throws ServletException, IOException {
        // Arrange
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("InvalidFormat token123");

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Should authenticate with valid internal JWT token")
    void shouldAuthenticateWithValidInternalJWT() throws ServletException, IOException {
        // Arrange
        String token = "valid.jwt.token";
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getStudentIdFromToken(token)).thenReturn(testStudentId);
        when(studentRepository.findById(testStudentId)).thenReturn(Optional.of(testStudent));

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isEqualTo(testStudent);
        assertThat(auth.getAuthorities()).hasSize(1);
        assertThat(auth.getAuthorities().iterator().next().getAuthority()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("Should not authenticate with valid JWT but non-existent student")
    void shouldNotAuthenticateWithValidJWTButNoStudent() throws ServletException, IOException {
        // Arrange
        String token = "valid.jwt.token";
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getStudentIdFromToken(token)).thenReturn(testStudentId);
        when(studentRepository.findById(testStudentId)).thenReturn(Optional.empty());

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Should fallback to Firebase token verification when internal JWT invalid")
    void shouldFallbackToFirebaseTokenVerification() throws ServletException, IOException, FirebaseAuthException {
        // Arrange
        String token = "firebase.id.token";
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(false);

        FirebaseToken firebaseToken = mock(FirebaseToken.class);
        when(firebaseToken.getUid()).thenReturn(testFirebaseUid);
        when(studentRepository.findByFirebaseUid(testFirebaseUid)).thenReturn(Optional.of(testStudent));

        // Act
        try (MockedStatic<FirebaseAuth> firebaseAuthMock = mockStatic(FirebaseAuth.class)) {
            FirebaseAuth firebaseAuth = mock(FirebaseAuth.class);
            firebaseAuthMock.when(FirebaseAuth::getInstance).thenReturn(firebaseAuth);
            when(firebaseAuth.verifyIdToken(token)).thenReturn(firebaseToken);

            firebaseTokenFilter.doFilterInternal(request, response, filterChain);
        }

        // Assert
        verify(filterChain).doFilter(request, response);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isEqualTo(testStudent);
    }

    @Test
    @DisplayName("Should not authenticate with Firebase token for non-existent user")
    void shouldNotAuthenticateWithFirebaseTokenForNonExistentUser() throws ServletException, IOException, FirebaseAuthException {
        // Arrange
        String token = "firebase.id.token";
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(false);

        FirebaseToken firebaseToken = mock(FirebaseToken.class);
        when(firebaseToken.getUid()).thenReturn(testFirebaseUid);
        when(studentRepository.findByFirebaseUid(testFirebaseUid)).thenReturn(Optional.empty());

        // Act
        try (MockedStatic<FirebaseAuth> firebaseAuthMock = mockStatic(FirebaseAuth.class)) {
            FirebaseAuth firebaseAuth = mock(FirebaseAuth.class);
            firebaseAuthMock.when(FirebaseAuth::getInstance).thenReturn(firebaseAuth);
            when(firebaseAuth.verifyIdToken(token)).thenReturn(firebaseToken);

            firebaseTokenFilter.doFilterInternal(request, response, filterChain);
        }

        // Assert
        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Should handle Firebase token verification failure")
    void shouldHandleFirebaseTokenVerificationFailure() throws ServletException, IOException, FirebaseAuthException {
        // Arrange
        String token = "invalid.firebase.token";
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(false);

        // Act
        try (MockedStatic<FirebaseAuth> firebaseAuthMock = mockStatic(FirebaseAuth.class)) {
            FirebaseAuth firebaseAuth = mock(FirebaseAuth.class);
            firebaseAuthMock.when(FirebaseAuth::getInstance).thenReturn(firebaseAuth);
            when(firebaseAuth.verifyIdToken(token)).thenThrow(new RuntimeException("Invalid token"));

            firebaseTokenFilter.doFilterInternal(request, response, filterChain);
        }

        // Assert
        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Should handle exception during authentication gracefully")
    void shouldHandleExceptionGracefully() throws ServletException, IOException {
        // Arrange
        String token = "some.token";
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenThrow(new RuntimeException("Unexpected error"));

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert - filter should continue despite exception
        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Should extract token correctly from Bearer header")
    void shouldExtractTokenCorrectlyFromBearerHeader() throws ServletException, IOException {
        // Arrange
        String token = "mytoken123";
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getStudentIdFromToken(token)).thenReturn(testStudentId);
        when(studentRepository.findById(testStudentId)).thenReturn(Optional.of(testStudent));

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(jwtTokenProvider).validateToken(token); // Verify correct token was extracted
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should handle Bearer token with extra spaces")
    void shouldHandleBearerTokenWithExtraSpaces() throws ServletException, IOException {
        // Arrange
        String token = "mytoken123";
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("Bearer  " + token); // Extra space
        when(jwtTokenProvider.validateToken(" " + token)).thenReturn(false);

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        verify(filterChain).doFilter(request, response);
        // Should fail validation due to extra space in token
    }

    @Test
    @DisplayName("Should set authentication details from request")
    void shouldSetAuthenticationDetailsFromRequest() throws ServletException, IOException {
        // Arrange
        String token = "valid.jwt.token";
        when(request.getServletPath()).thenReturn("/api/materials");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(request.getRemoteAddr()).thenReturn("192.168.1.1");
        when(request.getSession(false)).thenReturn(null);
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(jwtTokenProvider.getStudentIdFromToken(token)).thenReturn(testStudentId);
        when(studentRepository.findById(testStudentId)).thenReturn(Optional.of(testStudent));

        // Act
        firebaseTokenFilter.doFilterInternal(request, response, filterChain);

        // Assert
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getDetails()).isNotNull();
    }

    @Test
    @DisplayName("Should match skip URLs correctly with wildcards")
    void shouldMatchSkipUrlsCorrectlyWithWildcards() throws ServletException, IOException {
        // Arrange - test various swagger paths
        String[] swaggerPaths = {
            "/swagger-ui/index.html",
            "/swagger-ui/swagger-ui.css",
            "/v3/api-docs/swagger-config"
        };

        for (String path : swaggerPaths) {
            SecurityContextHolder.clearContext();
            when(request.getServletPath()).thenReturn(path);

            // Act
            firebaseTokenFilter.doFilterInternal(request, response, filterChain);

            // Assert
            verify(filterChain, times(1)).doFilter(request, response);
            verifyNoInteractions(jwtTokenProvider);
        }
    }
}

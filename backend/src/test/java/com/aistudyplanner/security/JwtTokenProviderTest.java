package com.aistudyplanner.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JWT Token Provider Tests")
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private static final String TEST_SECRET = "test-secret-key-minimum-256-bits-long-for-hs256-algorithm-security";
    private static final long TEST_EXPIRATION = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(TEST_SECRET, TEST_EXPIRATION);
    }

    @Test
    @DisplayName("Should generate valid JWT token")
    void shouldGenerateValidToken() {
        // Arrange
        UUID studentId = UUID.randomUUID();
        String firebaseUid = "firebase-uid-123";

        // Act
        String token = jwtTokenProvider.generateToken(studentId, firebaseUid);

        // Assert
        assertThat(token).isNotNull().isNotEmpty();
        assertThat(token.split("\\.")).hasSize(3); // JWT has 3 parts
    }

    @Test
    @DisplayName("Should validate correct token")
    void shouldValidateCorrectToken() {
        // Arrange
        UUID studentId = UUID.randomUUID();
        String firebaseUid = "firebase-uid-123";
        String token = jwtTokenProvider.generateToken(studentId, firebaseUid);

        // Act
        boolean isValid = jwtTokenProvider.validateToken(token);

        // Assert
        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Should reject malformed token")
    void shouldRejectMalformedToken() {
        // Arrange
        String malformedToken = "not.a.valid.jwt.token";

        // Act
        boolean isValid = jwtTokenProvider.validateToken(malformedToken);

        // Assert
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should reject null token")
    void shouldRejectNullToken() {
        // Act
        boolean isValid = jwtTokenProvider.validateToken(null);

        // Assert
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should reject empty token")
    void shouldRejectEmptyToken() {
        // Act
        boolean isValid = jwtTokenProvider.validateToken("");

        // Assert
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should reject expired token")
    void shouldRejectExpiredToken() {
        // Arrange - create token with very short expiration
        JwtTokenProvider shortLivedProvider = new JwtTokenProvider(TEST_SECRET, 1); // 1ms
        UUID studentId = UUID.randomUUID();
        String firebaseUid = "firebase-uid-123";
        String token = shortLivedProvider.generateToken(studentId, firebaseUid);

        // Act - wait for token to expire
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        boolean isValid = shortLivedProvider.validateToken(token);

        // Assert
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should reject token with wrong signature")
    void shouldRejectTokenWithWrongSignature() {
        // Arrange - create token with different secret
        String differentSecret = "different-secret-key-minimum-256-bits-long-for-hs256-algorithm";
        JwtTokenProvider differentProvider = new JwtTokenProvider(differentSecret, TEST_EXPIRATION);
        UUID studentId = UUID.randomUUID();
        String firebaseUid = "firebase-uid-123";
        String token = differentProvider.generateToken(studentId, firebaseUid);

        // Act - try to validate with original provider
        boolean isValid = jwtTokenProvider.validateToken(token);

        // Assert
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should extract correct student ID from token")
    void shouldExtractCorrectStudentId() {
        // Arrange
        UUID studentId = UUID.randomUUID();
        String firebaseUid = "firebase-uid-123";
        String token = jwtTokenProvider.generateToken(studentId, firebaseUid);

        // Act
        UUID extractedId = jwtTokenProvider.getStudentIdFromToken(token);

        // Assert
        assertThat(extractedId).isEqualTo(studentId);
    }

    @Test
    @DisplayName("Should extract correct Firebase UID from token")
    void shouldExtractCorrectFirebaseUid() {
        // Arrange
        UUID studentId = UUID.randomUUID();
        String firebaseUid = "firebase-uid-123";
        String token = jwtTokenProvider.generateToken(studentId, firebaseUid);

        // Act
        String extractedUid = jwtTokenProvider.getFirebaseUidFromToken(token);

        // Assert
        assertThat(extractedUid).isEqualTo(firebaseUid);
    }

    @Test
    @DisplayName("Should throw exception when extracting from invalid token")
    void shouldThrowExceptionWhenExtractingFromInvalidToken() {
        // Arrange
        String invalidToken = "invalid.token.here";

        // Act & Assert
        assertThatThrownBy(() -> jwtTokenProvider.getStudentIdFromToken(invalidToken))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("Generated token should contain required claims")
    void generatedTokenShouldContainRequiredClaims() {
        // Arrange
        UUID studentId = UUID.randomUUID();
        String firebaseUid = "firebase-uid-123";
        String token = jwtTokenProvider.generateToken(studentId, firebaseUid);

        // Act - manually parse token to verify claims
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        // Assert
        assertThat(claims.getSubject()).isEqualTo(studentId.toString());
        assertThat(claims.get("firebaseUid", String.class)).isEqualTo(firebaseUid);
        assertThat(claims.get("role", String.class)).isEqualTo("ROLE_USER");
        assertThat(claims.getIssuedAt()).isNotNull();
        assertThat(claims.getExpiration()).isNotNull();
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }

    @Test
    @DisplayName("Token expiration should be correctly set")
    void tokenExpirationShouldBeCorrectlySet() {
        // Arrange
        UUID studentId = UUID.randomUUID();
        String firebaseUid = "firebase-uid-123";

        // Act
        String token = jwtTokenProvider.generateToken(studentId, firebaseUid);

        // Assert - parse and check expiration is approximately correct
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        long expirationTime = claims.getExpiration().getTime();
        long issuedTime = claims.getIssuedAt().getTime();
        long tokenLifetime = expirationTime - issuedTime;

        // Verify token lifetime is approximately TEST_EXPIRATION (within 100ms tolerance)
        assertThat(tokenLifetime)
                .isCloseTo(TEST_EXPIRATION, within(100L));
    }

    @Test
    @DisplayName("Should handle special characters in Firebase UID")
    void shouldHandleSpecialCharactersInFirebaseUid() {
        // Arrange
        UUID studentId = UUID.randomUUID();
        String firebaseUid = "firebase-uid-with-special-chars_@#$%";

        // Act
        String token = jwtTokenProvider.generateToken(studentId, firebaseUid);
        String extractedUid = jwtTokenProvider.getFirebaseUidFromToken(token);

        // Assert
        assertThat(extractedUid).isEqualTo(firebaseUid);
    }

    @Test
    @DisplayName("Should generate different tokens for different student IDs")
    void shouldGenerateDifferentTokensForDifferentStudentIds() {
        // Arrange
        UUID studentId1 = UUID.randomUUID();
        UUID studentId2 = UUID.randomUUID();
        String firebaseUid = "firebase-uid-123";

        // Act
        String token1 = jwtTokenProvider.generateToken(studentId1, firebaseUid);
        String token2 = jwtTokenProvider.generateToken(studentId2, firebaseUid);

        // Assert
        assertThat(token1).isNotEqualTo(token2);
    }

    @Test
    @DisplayName("Should generate different tokens for same data at different times")
    void shouldGenerateDifferentTokensAtDifferentTimes() throws InterruptedException {
        // Arrange
        UUID studentId = UUID.randomUUID();
        String firebaseUid = "firebase-uid-123";

        // Act
        String token1 = jwtTokenProvider.generateToken(studentId, firebaseUid);
        Thread.sleep(1100); // Wait longer to ensure different issuedAt timestamp (rounded to seconds)
        String token2 = jwtTokenProvider.generateToken(studentId, firebaseUid);

        // Assert - tokens should be different due to different issuedAt timestamps
        assertThat(token1).isNotEqualTo(token2);
    }
}

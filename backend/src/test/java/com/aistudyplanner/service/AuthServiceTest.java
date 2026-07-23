package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.request.LoginRequest;
import com.aistudyplanner.model.dto.response.AuthResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.security.JwtTokenProvider;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private FirebaseToken firebaseToken;

    @InjectMocks
    private AuthService authService;

    private MockedStatic<FirebaseAuth> mockedFirebaseAuth;
    private FirebaseAuth firebaseAuthInstance;

    @BeforeEach
    void setUp() {
        firebaseAuthInstance = mock(FirebaseAuth.class);
        mockedFirebaseAuth = mockStatic(FirebaseAuth.class);
        mockedFirebaseAuth.when(FirebaseAuth::getInstance).thenReturn(firebaseAuthInstance);
    }

    @AfterEach
    void tearDown() {
        mockedFirebaseAuth.close();
    }

    @Test
    @DisplayName("Login new user successfully")
    void testLogin_NewUser() throws FirebaseAuthException {
        LoginRequest request = new LoginRequest("valid_firebase_token");
        String uid = "newUid123";

        when(firebaseAuthInstance.verifyIdToken(anyString())).thenReturn(firebaseToken);
        when(firebaseToken.getUid()).thenReturn(uid);
        when(firebaseToken.getEmail()).thenReturn("test@example.com");
        when(firebaseToken.getName()).thenReturn("Test User");
        Map<String, Object> claims = new HashMap<>();
        claims.put("phone_number", "+1234567890");
        when(firebaseToken.getClaims()).thenReturn(claims);

        when(studentRepository.findByFirebaseUid(uid)).thenReturn(Optional.empty());

        Student savedStudent = Student.builder().id(UUID.randomUUID()).firebaseUid(uid).build();
        when(studentRepository.save(any(Student.class))).thenReturn(savedStudent);
        when(jwtTokenProvider.generateToken(any(), anyString())).thenReturn("jwt_token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertTrue(response.isNewUser());
        assertEquals("jwt_token", response.getToken());
        verify(studentRepository, times(1)).save(any(Student.class));
    }

    @Test
    @DisplayName("Login existing user successfully and update streak (consecutive day)")
    void testLogin_ExistingUser_ConsecutiveDay() throws FirebaseAuthException {
        LoginRequest request = new LoginRequest("valid_firebase_token");
        String uid = "existingUid";

        when(firebaseAuthInstance.verifyIdToken(anyString())).thenReturn(firebaseToken);
        when(firebaseToken.getUid()).thenReturn(uid);
        when(firebaseToken.getClaims()).thenReturn(new HashMap<>());

        Student existingStudent = Student.builder()
                .id(UUID.randomUUID())
                .firebaseUid(uid)
                .lastActiveDate(LocalDate.now().minusDays(1))
                .studyStreak(5)
                .build();

        when(studentRepository.findByFirebaseUid(uid)).thenReturn(Optional.of(existingStudent));
        when(studentRepository.save(any(Student.class))).thenReturn(existingStudent);
        when(jwtTokenProvider.generateToken(any(), anyString())).thenReturn("jwt_token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertFalse(response.isNewUser());
        assertEquals(6, existingStudent.getStudyStreak()); // Streak increased
        assertEquals(LocalDate.now(), existingStudent.getLastActiveDate());
    }

    @Test
    @DisplayName("Login existing user and reset streak (missed day)")
    void testLogin_ExistingUser_MissedDay() throws FirebaseAuthException {
        LoginRequest request = new LoginRequest("valid_firebase_token");
        String uid = "existingUid";

        when(firebaseAuthInstance.verifyIdToken(anyString())).thenReturn(firebaseToken);
        when(firebaseToken.getUid()).thenReturn(uid);
        when(firebaseToken.getClaims()).thenReturn(new HashMap<>());

        Student existingStudent = Student.builder()
                .id(UUID.randomUUID())
                .firebaseUid(uid)
                .lastActiveDate(LocalDate.now().minusDays(2)) // Missed a day
                .studyStreak(5)
                .build();

        when(studentRepository.findByFirebaseUid(uid)).thenReturn(Optional.of(existingStudent));
        when(studentRepository.save(any(Student.class))).thenReturn(existingStudent);
        
        authService.login(request);

        assertEquals(1, existingStudent.getStudyStreak()); // Streak reset to 1
    }

    @Test
    @DisplayName("Login fails with invalid Firebase token")
    void testLogin_InvalidToken() throws FirebaseAuthException {
        LoginRequest request = new LoginRequest("invalid_token");

        when(firebaseAuthInstance.verifyIdToken(anyString())).thenThrow(new RuntimeException("Invalid token"));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertEquals("Invalid Firebase token", exception.getMessage());
    }

    @Test
    @DisplayName("Refresh token successfully")
    void testRefreshToken_Success() throws FirebaseAuthException {
        String uid = "existingUid";
        when(firebaseAuthInstance.verifyIdToken(anyString())).thenReturn(firebaseToken);
        when(firebaseToken.getUid()).thenReturn(uid);

        Student existingStudent = Student.builder().id(UUID.randomUUID()).firebaseUid(uid).build();
        when(studentRepository.findByFirebaseUid(uid)).thenReturn(Optional.of(existingStudent));
        when(jwtTokenProvider.generateToken(any(), anyString())).thenReturn("new_jwt_token");

        AuthResponse response = authService.refreshToken("valid_firebase_token");

        assertNotNull(response);
        assertEquals("new_jwt_token", response.getToken());
        assertFalse(response.isNewUser());
    }

    @Test
    @DisplayName("Refresh token fails for non-existent user")
    void testRefreshToken_UserNotFound() throws FirebaseAuthException {
        String uid = "nonExistentUid";
        when(firebaseAuthInstance.verifyIdToken(anyString())).thenReturn(firebaseToken);
        when(firebaseToken.getUid()).thenReturn(uid);
        
        when(studentRepository.findByFirebaseUid(uid)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> authService.refreshToken("valid_firebase_token"));
        assertEquals("User not found", exception.getMessage());
    }
}

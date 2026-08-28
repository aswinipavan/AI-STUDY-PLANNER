package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.request.LoginRequest;
import com.aistudyplanner.model.dto.request.UpdateProfileRequest;
import com.aistudyplanner.model.dto.response.AuthResponse;
import com.aistudyplanner.model.dto.response.StudentResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import com.aistudyplanner.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StudentProfilePersistenceTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private FirebaseAuth firebaseAuth;

    @Mock
    private FirebaseToken firebaseToken;

    @InjectMocks
    private StudentService studentService;

    @InjectMocks
    private AuthService authService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("Full profile update persists every editable field")
    void testFullProfileUpdate_PersistsAllFields() {
        UUID studentId = UUID.randomUUID();
        Student student = Student.builder()
                .id(studentId)
                .firebaseUid("fb-uid-123")
                .fullName("Initial Name")
                .email("test@example.com")
                .build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(studentRepository.save(any(Student.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .fullName("Aswin Kumar Pavan")
                .collegeName("IIT Madras")
                .semester(5)
                .department("Computer Science")
                .phoneNumber("+91 9876543210")
                .availableHoursPerDay(BigDecimal.valueOf(3.5))
                .preferredStudyTime("MORNING")
                .profilePictureUrl("https://example.com/avatar.jpg")
                .build();

        StudentResponse response = studentService.updateProfile(studentId, request);

        assertNotNull(response);
        assertEquals("Aswin Kumar Pavan", response.getFullName());
        assertEquals("IIT Madras", response.getCollegeName());
        assertEquals(5, response.getSemester());
        assertEquals("Computer Science", response.getDepartment());
        assertEquals("+91 9876543210", response.getPhoneNumber());
        assertEquals(BigDecimal.valueOf(3.5), response.getAvailableHoursPerDay());
        assertEquals("MORNING", response.getPreferredStudyTime());
        assertEquals("https://example.com/avatar.jpg", response.getProfilePictureUrl());
    }

    @Test
    @DisplayName("Partial profile update does NOT erase untouched fields")
    void testPartialProfileUpdate_PreservesUntouchedFields() {
        UUID studentId = UUID.randomUUID();
        Student student = Student.builder()
                .id(studentId)
                .firebaseUid("fb-uid-123")
                .fullName("Aswin Kumar")
                .email("test@example.com")
                .collegeName("MIT")
                .semester(6)
                .department("Computer Science")
                .phoneNumber("+91 9876543210")
                .availableHoursPerDay(BigDecimal.valueOf(4.0))
                .preferredStudyTime("EVENING")
                .profilePictureUrl("https://example.com/existing-avatar.jpg")
                .build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(studentRepository.save(any(Student.class))).thenAnswer(inv -> inv.getArgument(0));

        // Update ONLY college name
        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .collegeName("Stanford University")
                .build();

        StudentResponse response = studentService.updateProfile(studentId, request);

        assertNotNull(response);
        assertEquals("Stanford University", response.getCollegeName()); // Changed
        // All other fields remain intact:
        assertEquals("Aswin Kumar", response.getFullName());
        assertEquals(6, response.getSemester());
        assertEquals("Computer Science", response.getDepartment());
        assertEquals("+91 9876543210", response.getPhoneNumber());
        assertEquals(BigDecimal.valueOf(4.0), response.getAvailableHoursPerDay());
        assertEquals("EVENING", response.getPreferredStudyTime());
        assertEquals("https://example.com/existing-avatar.jpg", response.getProfilePictureUrl());
    }

    @Test
    @DisplayName("Jackson deserializes flexible semester inputs: string '1st Year', 'Semester 5', integer 3")
    void testSemesterFlexibleDeserialization() throws Exception {
        // String "1st Year" -> 1
        String json1 = "{\"semester\": \"1st Year\"}";
        UpdateProfileRequest req1 = objectMapper.readValue(json1, UpdateProfileRequest.class);
        assertEquals(1, req1.getSemester());

        // String "Semester 5" -> 5
        String json2 = "{\"semester\": \"Semester 5\"}";
        UpdateProfileRequest req2 = objectMapper.readValue(json2, UpdateProfileRequest.class);
        assertEquals(5, req2.getSemester());

        // Integer 3 -> 3
        String json3 = "{\"semester\": 3}";
        UpdateProfileRequest req3 = objectMapper.readValue(json3, UpdateProfileRequest.class);
        assertEquals(3, req3.getSemester());

        // String "3" -> 3
        String json4 = "{\"semester\": \"3\"}";
        UpdateProfileRequest req4 = objectMapper.readValue(json4, UpdateProfileRequest.class);
        assertEquals(3, req4.getSemester());

        // Null -> null
        String json5 = "{\"semester\": null}";
        UpdateProfileRequest req5 = objectMapper.readValue(json5, UpdateProfileRequest.class);
        assertNull(req5.getSemester());

        // Empty string -> null
        String json6 = "{\"semester\": \"\"}";
        UpdateProfileRequest req6 = objectMapper.readValue(json6, UpdateProfileRequest.class);
        assertNull(req6.getSemester());
    }

    @Test
    @DisplayName("Empty phone number clears phone number to null (preventing SQL unique collision)")
    void testPhoneNumber_EmptyStringSetsNull() {
        UUID studentId = UUID.randomUUID();
        Student student = Student.builder()
                .id(studentId)
                .firebaseUid("fb-uid-123")
                .phoneNumber("+91 9876543210")
                .build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(studentRepository.save(any(Student.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .phoneNumber("   ")
                .build();

        StudentResponse response = studentService.updateProfile(studentId, request);
        assertNull(response.getPhoneNumber());
    }

    @Test
    @DisplayName("Duplicate phone number throws IllegalArgumentException when claimed by another student")
    void testPhoneNumber_DuplicateThrowsException() {
        UUID studentId1 = UUID.randomUUID();
        UUID studentId2 = UUID.randomUUID();

        Student student1 = Student.builder().id(studentId1).build();
        Student student2 = Student.builder().id(studentId2).phoneNumber("+91 1234567890").build();

        when(studentRepository.findById(studentId1)).thenReturn(Optional.of(student1));
        when(studentRepository.findByPhoneNumber("+91 1234567890")).thenReturn(Optional.of(student2));

        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .phoneNumber("+91 1234567890")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> studentService.updateProfile(studentId1, request));

        assertTrue(ex.getMessage().contains("already associated"));
    }

    @Test
    @DisplayName("Same Google/Firebase UID always restores the SAME student record across logins without duplicates")
    void testSameFirebaseUid_RestoresSameStudent() throws FirebaseAuthException {
        String uid = "google-user-fixed-uid-999";
        UUID existingStudentId = UUID.randomUUID();

        Student existingStudent = Student.builder()
                .id(existingStudentId)
                .firebaseUid(uid)
                .fullName("Aswin Kumar")
                .email("aswin@gmail.com")
                .collegeName("NIT")
                .semester(6)
                .department("Computer Science")
                .phoneNumber("+91 9876543210")
                .profilePictureUrl("https://lh3.googleusercontent.com/a/photo.jpg")
                .studyStreak(3)
                .lastActiveDate(LocalDate.now().minusDays(1))
                .build();

        LoginRequest request = new LoginRequest("valid_token");

        when(firebaseAuth.verifyIdToken("valid_token")).thenReturn(firebaseToken);
        when(firebaseToken.getUid()).thenReturn(uid);
        when(firebaseToken.getClaims()).thenReturn(new HashMap<>());
        when(studentRepository.findByFirebaseUid(uid)).thenReturn(Optional.of(existingStudent));
        when(studentRepository.save(any(Student.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateToken(existingStudentId, uid)).thenReturn("jwt-mock-token");

        // First login attempt with existing account
        AuthResponse res1 = authService.login(request);
        assertFalse(res1.isNewUser());
        assertEquals(existingStudentId, res1.getStudent().getId());
        assertEquals("Aswin Kumar", res1.getStudent().getFullName());
        assertEquals("NIT", res1.getStudent().getCollegeName());
        assertEquals(6, res1.getStudent().getSemester());
        assertEquals("Computer Science", res1.getStudent().getDepartment());
        assertEquals("+91 9876543210", res1.getStudent().getPhoneNumber());
        assertEquals("https://lh3.googleusercontent.com/a/photo.jpg", res1.getStudent().getProfilePictureUrl());

        // Subsequent login attempt with SAME account
        AuthResponse res2 = authService.login(request);
        assertFalse(res2.isNewUser());
        assertEquals(existingStudentId, res2.getStudent().getId());
        assertEquals(uid, res2.getStudent().getFirebaseUid());

        // Verify save was called only to update activity/streak, NEVER duplicating the row
        ArgumentCaptor<Student> captor = ArgumentCaptor.forClass(Student.class);
        verify(studentRepository, times(2)).save(captor.capture());
        for (Student saved : captor.getAllValues()) {
            assertEquals(existingStudentId, saved.getId());
            assertEquals(uid, saved.getFirebaseUid());
            assertEquals("NIT", saved.getCollegeName());
        }
    }
}

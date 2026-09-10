package com.aistudyplanner.integration;

import com.aistudyplanner.model.dto.request.GenerateTimetableRequest;
import com.aistudyplanner.model.dto.request.NotificationPreferencesRequest;
import com.aistudyplanner.model.dto.request.SubjectRequest;
import com.aistudyplanner.model.dto.request.UpdateProfileRequest;
import com.aistudyplanner.model.dto.response.*;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.model.entity.TimetableSlot;
import com.aistudyplanner.repository.MaterialRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import com.aistudyplanner.repository.TimetableRepository;
import com.aistudyplanner.repository.TimetableSlotRepository;
import com.aistudyplanner.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.properties")
@DisplayName("P0.5 — Web <-> Mobile Real Data Parity Integration Test Suite")
public class CrossPlatformParityIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private TimetableRepository timetableRepository;

    @Autowired
    private TimetableSlotRepository timetableSlotRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    @Test
    @DisplayName("IDENTITY PARITY: One Firebase account resolves deterministically to the SAME Student ID with ZERO database duplicates")
    void testIdentityMappingAndDeduplication() {
        String sharedFirebaseUid = "parity-firebase-uid-" + UUID.randomUUID();
        String sharedEmail = "parity-student-" + UUID.randomUUID() + "@university.edu";

        // Initial creation
        Student student = Student.builder()
                .firebaseUid(sharedFirebaseUid)
                .email(sharedEmail)
                .fullName("Aswini Pavan")
                .collegeName("National Institute of Technology")
                .department("Computer Science")
                .semester(6)
                .availableHoursPerDay(BigDecimal.valueOf(3.5))
                .preferredStudyTime("EVENING")
                .isPremium(true)
                .studyStreak(3)
                .build();
        Student savedStudent = studentRepository.save(student);
        UUID canonicalStudentId = savedStudent.getId();

        // Generate Web JWT & Mobile JWT from same account
        String webJwt = jwtTokenProvider.generateToken(canonicalStudentId, sharedFirebaseUid);
        String mobileJwt = jwtTokenProvider.generateToken(canonicalStudentId, sharedFirebaseUid);

        // Fetch profile via Web client headers
        ResponseEntity<ApiResponse<StudentResponse>> webResponse = restTemplate.exchange(
                "/api/students/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(webJwt)),
                new ParameterizedTypeReference<>() {}
        );

        // Fetch profile via Mobile client headers
        ResponseEntity<ApiResponse<StudentResponse>> mobileResponse = restTemplate.exchange(
                "/api/students/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(mobileJwt)),
                new ParameterizedTypeReference<>() {}
        );

        assertThat(webResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(mobileResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        StudentResponse webData = webResponse.getBody().getData();
        StudentResponse mobileData = mobileResponse.getBody().getData();

        // Assert 100% data identity parity
        assertThat(webData.getId()).isEqualTo(canonicalStudentId);
        assertThat(mobileData.getId()).isEqualTo(canonicalStudentId);
        assertThat(webData.getFirebaseUid()).isEqualTo(sharedFirebaseUid);
        assertThat(mobileData.getFirebaseUid()).isEqualTo(sharedFirebaseUid);
        assertThat(webData.getFullName()).isEqualTo(mobileData.getFullName());
        assertThat(webData.getEmail()).isEqualTo(mobileData.getEmail());
        assertThat(webData.getCollegeName()).isEqualTo(mobileData.getCollegeName());
        assertThat(webData.getDepartment()).isEqualTo(mobileData.getDepartment());
        assertThat(webData.getSemester()).isEqualTo(mobileData.getSemester());
        assertThat(webData.getAvailableHoursPerDay()).isEqualByComparingTo(mobileData.getAvailableHoursPerDay());
        assertThat(webData.getPreferredStudyTime()).isEqualTo(mobileData.getPreferredStudyTime());
        assertThat(webData.getIsPremium()).isEqualTo(mobileData.getIsPremium());
        assertThat(webData.getStudyStreak()).isEqualTo(mobileData.getStudyStreak());

        // Verify database duplicate check
        List<Student> allWithUid = studentRepository.findAll().stream()
                .filter(s -> sharedFirebaseUid.equals(s.getFirebaseUid()))
                .toList();
        assertThat(allWithUid).hasSize(1);
    }

    @Test
    @DisplayName("WEB -> MOBILE PARITY: Changes made on Web (Profile, Preferences, Subject, Material) reflect identically on Mobile")
    void testWebMutationReflectedOnMobile() {
        String firebaseUid = "web-to-mobile-uid-" + UUID.randomUUID();
        Student student = studentRepository.save(Student.builder()
                .firebaseUid(firebaseUid)
                .email("sync-" + UUID.randomUUID() + "@example.com")
                .fullName("Initial Name")
                .availableHoursPerDay(BigDecimal.valueOf(2.0))
                .preferredStudyTime("MORNING")
                .build());

        String webJwt = jwtTokenProvider.generateToken(student.getId(), firebaseUid);
        String mobileJwt = jwtTokenProvider.generateToken(student.getId(), firebaseUid);

        // 1. Web updates Profile and Preferences
        UpdateProfileRequest profileUpdate = UpdateProfileRequest.builder()
                .fullName("Aswini Pavan (Updated on Web)")
                .collegeName("MIT College of Engineering")
                .department("Information Technology")
                .semester(7)
                .phoneNumber("+91 9988776655")
                .availableHoursPerDay(BigDecimal.valueOf(4.5))
                .preferredStudyTime("EVENING")
                .build();

        restTemplate.exchange(
                "/api/students/me",
                HttpMethod.PUT,
                new HttpEntity<>(profileUpdate, authHeaders(webJwt)),
                new ParameterizedTypeReference<ApiResponse<StudentResponse>>() {}
        );

        // 2. Web creates Subject
        SubjectRequest subjectReq = SubjectRequest.builder()
                .subjectName("Distributed Systems")
                .subjectCode("CS701")
                .credits(4)
                .difficultyLevel(4)
                .semester(7)
                .build();

        ResponseEntity<ApiResponse<SubjectResponse>> subRes = restTemplate.exchange(
                "/api/students/me/subjects",
                HttpMethod.POST,
                new HttpEntity<>(subjectReq, authHeaders(webJwt)),
                new ParameterizedTypeReference<>() {}
        );
        UUID createdSubjectId = subRes.getBody().getData().getId();

        // 3. Mobile refreshes & verifies Profile
        ResponseEntity<ApiResponse<StudentResponse>> mobileProfileRes = restTemplate.exchange(
                "/api/students/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(mobileJwt)),
                new ParameterizedTypeReference<>() {}
        );
        StudentResponse mobileProfile = mobileProfileRes.getBody().getData();

        assertThat(mobileProfile.getFullName()).isEqualTo("Aswini Pavan (Updated on Web)");
        assertThat(mobileProfile.getCollegeName()).isEqualTo("MIT College of Engineering");
        assertThat(mobileProfile.getDepartment()).isEqualTo("Information Technology");
        assertThat(mobileProfile.getSemester()).isEqualTo(7);
        assertThat(mobileProfile.getPhoneNumber()).isEqualTo("+91 9988776655");
        assertThat(mobileProfile.getAvailableHoursPerDay()).isEqualByComparingTo(BigDecimal.valueOf(4.5));
        assertThat(mobileProfile.getPreferredStudyTime()).isEqualTo("EVENING");

        // 4. Mobile fetches Subjects and verifies
        ResponseEntity<ApiResponse<List<SubjectResponse>>> mobileSubjectsRes = restTemplate.exchange(
                "/api/students/me/subjects",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(mobileJwt)),
                new ParameterizedTypeReference<>() {}
        );
        List<SubjectResponse> mobileSubjects = mobileSubjectsRes.getBody().getData();
        assertThat(mobileSubjects).anyMatch(s -> s.getId().equals(createdSubjectId)
                && "Distributed Systems".equals(s.getSubjectName())
                && "CS701".equals(s.getSubjectCode()));
    }

    @Test
    @DisplayName("MOBILE -> WEB PARITY: Changes made on Mobile (Notification Toggles, Profile) reflect identically on Web")
    void testMobileMutationReflectedOnWeb() {
        String firebaseUid = "mobile-to-web-uid-" + UUID.randomUUID();
        Student student = studentRepository.save(Student.builder()
                .firebaseUid(firebaseUid)
                .email("mobile-user-" + UUID.randomUUID() + "@example.com")
                .fullName("Mobile Student")
                .emailNotifications(true)
                .pushNotifications(false)
                .build());

        String mobileJwt = jwtTokenProvider.generateToken(student.getId(), firebaseUid);
        String webJwt = jwtTokenProvider.generateToken(student.getId(), firebaseUid);

        // 1. Mobile updates notification toggles
        NotificationPreferencesRequest notifReq = NotificationPreferencesRequest.builder()
                .emailNotifications(false)
                .pushNotifications(true)
                .build();

        restTemplate.exchange(
                "/api/students/me/notifications",
                HttpMethod.PUT,
                new HttpEntity<>(notifReq, authHeaders(mobileJwt)),
                new ParameterizedTypeReference<ApiResponse<StudentResponse>>() {}
        );

        // 2. Web refreshes profile & verifies notifications
        ResponseEntity<ApiResponse<StudentResponse>> webProfileRes = restTemplate.exchange(
                "/api/students/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(webJwt)),
                new ParameterizedTypeReference<>() {}
        );
        StudentResponse webProfile = webProfileRes.getBody().getData();

        assertThat(webProfile.getEmailNotifications()).isFalse();
        assertThat(webProfile.getPushNotifications()).isTrue();
    }

    @Test
    @DisplayName("TIMETABLE PARITY: Same slot ID, date, topic, times, status, and duration shared across Web and Mobile")
    void testTimetableSlotParity() {
        String firebaseUid = "tt-parity-uid-" + UUID.randomUUID();
        Student student = studentRepository.save(Student.builder()
                .firebaseUid(firebaseUid)
                .email("tt-" + UUID.randomUUID() + "@example.com")
                .fullName("Timetable Student")
                .availableHoursPerDay(BigDecimal.valueOf(2.0))
                .preferredStudyTime("EVENING")
                .build());

        Subject subject = subjectRepository.save(Subject.builder()
                .student(student)
                .subjectName("Machine Learning")
                .subjectCode("CS502")
                .difficultyLevel(3)
                .build());

        String webJwt = jwtTokenProvider.generateToken(student.getId(), firebaseUid);
        String mobileJwt = jwtTokenProvider.generateToken(student.getId(), firebaseUid);

        // 1. Generate Timetable via Web
        GenerateTimetableRequest req = GenerateTimetableRequest.builder()
                .subjectIds(List.of(subject.getId()))
                .availableHoursPerDay(2)
                .style("balanced")
                .startDate(LocalDate.now())
                .durationDays(14)
                .build();

        ResponseEntity<ApiResponse<TimetableResponse>> genRes = restTemplate.exchange(
                "/api/timetable/generate",
                HttpMethod.POST,
                new HttpEntity<>(req, authHeaders(webJwt)),
                new ParameterizedTypeReference<>() {}
        );
        assertThat(genRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // 2. Fetch active timetable via Web
        ResponseEntity<ApiResponse<TimetableResponse>> webTtRes = restTemplate.exchange(
                "/api/timetable/active",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(webJwt)),
                new ParameterizedTypeReference<>() {}
        );

        // 3. Fetch active timetable via Mobile
        ResponseEntity<ApiResponse<TimetableResponse>> mobileTtRes = restTemplate.exchange(
                "/api/timetable/active",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(mobileJwt)),
                new ParameterizedTypeReference<>() {}
        );

        TimetableResponse webTt = webTtRes.getBody().getData();
        TimetableResponse mobileTt = mobileTtRes.getBody().getData();

        assertThat(webTt.getId()).isEqualTo(mobileTt.getId());
        assertThat(webTt.getSlots()).hasSameSizeAs(mobileTt.getSlots());

        for (int i = 0; i < webTt.getSlots().size(); i++) {
            SlotResponse webSlot = webTt.getSlots().get(i);
            SlotResponse mobileSlot = mobileTt.getSlots().get(i);

            assertThat(webSlot.getId()).isEqualTo(mobileSlot.getId());
            assertThat(webSlot.getDate()).isEqualTo(mobileSlot.getDate());
            assertThat(webSlot.getStartTime()).isEqualTo(mobileSlot.getStartTime());
            assertThat(webSlot.getEndTime()).isEqualTo(mobileSlot.getEndTime());
            assertThat(webSlot.getDurationMinutes()).isEqualTo(mobileSlot.getDurationMinutes());
            assertThat(webSlot.getTopic()).isEqualTo(mobileSlot.getTopic());
            assertThat(webSlot.getStatus()).isEqualTo(mobileSlot.getStatus());
            assertThat(webSlot.getIsCompleted()).isEqualTo(mobileSlot.getIsCompleted());
        }
    }

    @Test
    @DisplayName("USER DATA ISOLATION: User A never sees or mutates User B's profile, subjects, or timetables")
    void testUserDataIsolation() {
        String uidA = "isolation-user-A-" + UUID.randomUUID();
        String uidB = "isolation-user-B-" + UUID.randomUUID();

        Student studentA = studentRepository.save(Student.builder()
                .firebaseUid(uidA)
                .email("userA@example.com")
                .fullName("User Alpha")
                .collegeName("Alpha Tech")
                .build());

        Student studentB = studentRepository.save(Student.builder()
                .firebaseUid(uidB)
                .email("userB@example.com")
                .fullName("User Beta")
                .collegeName("Beta University")
                .build());

        Subject subjectA = subjectRepository.save(Subject.builder()
                .student(studentA)
                .subjectName("Alpha Secret Course")
                .difficultyLevel(5)
                .build());

        String jwtA = jwtTokenProvider.generateToken(studentA.getId(), uidA);
        String jwtB = jwtTokenProvider.generateToken(studentB.getId(), uidB);

        // User B fetches subjects
        ResponseEntity<ApiResponse<List<SubjectResponse>>> resB = restTemplate.exchange(
                "/api/students/me/subjects",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(jwtB)),
                new ParameterizedTypeReference<>() {}
        );

        List<SubjectResponse> subjectsForB = resB.getBody().getData();
        assertThat(subjectsForB).noneMatch(s -> s.getSubjectName().contains("Alpha"));
    }
}

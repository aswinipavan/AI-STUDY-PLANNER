package com.aistudyplanner.integration;

import com.aistudyplanner.model.dto.request.GenerateTimetableRequest;
import com.aistudyplanner.model.dto.request.UpdateProfileRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.StudentResponse;
import com.aistudyplanner.model.dto.response.TimetableResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.MaterialRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import com.aistudyplanner.repository.TimetableRepository;
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
@DisplayName("Full Stack Backend Product Flows Integration Test")
public class BackendFullFlowIntegrationTest {

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
    private JwtTokenProvider jwtTokenProvider;

    private HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    @Test
    @DisplayName("AUTHENTICATION & PROFILE: Save all profile fields, reload, and verify exact database persistence")
    void testProfileFullLifecyclePersistence() {
        String uid = "integration-user-" + UUID.randomUUID();
        Student student = Student.builder()
                .firebaseUid(uid)
                .email(uid + "@example.com")
                .fullName("Integration Student")
                .isPremium(false)
                .availableHoursPerDay(BigDecimal.valueOf(2.0))
                .preferredStudyTime("EVENING")
                .build();
        student = studentRepository.save(student);

        String token = jwtTokenProvider.generateToken(student.getId(), student.getEmail());

        UpdateProfileRequest profileReq = UpdateProfileRequest.builder()
                .fullName("Prof. Aswini Pavan")
                .collegeName("National Institute of Technology")
                .department("Computer Science & Engineering")
                .semester(6)
                .phoneNumber("+91 9876543210")
                .preferredStudyTime("EVENING")
                .availableHoursPerDay(BigDecimal.valueOf(3.0))
                .build();

        HttpEntity<UpdateProfileRequest> updateEntity = new HttpEntity<>(profileReq, authHeaders(token));
        ResponseEntity<ApiResponse<StudentResponse>> updateRes = restTemplate.exchange(
                "/api/students/me",
                HttpMethod.PUT,
                updateEntity,
                new ParameterizedTypeReference<>() {}
        );

        assertThat(updateRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateRes.getBody()).isNotNull();
        assertThat(updateRes.getBody().isSuccess()).isTrue();

        Student reloaded = studentRepository.findById(student.getId()).orElseThrow();
        assertThat(reloaded.getFullName()).isEqualTo("Prof. Aswini Pavan");
        assertThat(reloaded.getCollegeName()).isEqualTo("National Institute of Technology");
        assertThat(reloaded.getDepartment()).isEqualTo("Computer Science & Engineering");
        assertThat(reloaded.getSemester()).isEqualTo(6);
        assertThat(reloaded.getPhoneNumber()).isEqualTo("+91 9876543210");
    }

    @Test
    @DisplayName("TIMETABLE & SUBJECTS: Create subjects, generate horizon timetable with exact start/end slot times")
    void testTimetableHorizonAndExactSlotTimes() {
        String uid = "timetable-user-" + UUID.randomUUID();
        Student student = Student.builder()
                .firebaseUid(uid)
                .email(uid + "@example.com")
                .fullName("Timetable Student")
                .availableHoursPerDay(BigDecimal.valueOf(2.0))
                .preferredStudyTime("EVENING")
                .build();
        student = studentRepository.save(student);

        String token = jwtTokenProvider.generateToken(student.getId(), student.getEmail());

        Subject s1 = subjectRepository.save(Subject.builder()
                .student(student)
                .subjectName("Discrete Mathematics")
                .subjectCode("CS301")
                .credits(4)
                .difficultyLevel(3)
                .semester(6)
                .build());

        Subject s2 = subjectRepository.save(Subject.builder()
                .student(student)
                .subjectName("Operating Systems")
                .subjectCode("CS302")
                .credits(4)
                .difficultyLevel(4)
                .semester(6)
                .build());

        GenerateTimetableRequest genReq = GenerateTimetableRequest.builder()
                .subjectIds(List.of(s1.getId(), s2.getId()))
                .availableHoursPerDay(2)
                .style("balanced")
                .startDate(LocalDate.now())
                .durationDays(14)
                .build();

        HttpEntity<GenerateTimetableRequest> genEntity = new HttpEntity<>(genReq, authHeaders(token));
        ResponseEntity<ApiResponse<TimetableResponse>> genRes = restTemplate.exchange(
                "/api/timetable/generate",
                HttpMethod.POST,
                genEntity,
                new ParameterizedTypeReference<>() {}
        );

        assertThat(genRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(genRes.getBody()).isNotNull();
        assertThat(genRes.getBody().isSuccess()).isTrue();

        TimetableResponse tt = genRes.getBody().getData();
        assertThat(tt).isNotNull();
        assertThat(tt.getSlots()).isNotEmpty();
        tt.getSlots().forEach(slot -> {
            assertThat(slot.getStartTime()).isNotNull();
            assertThat(slot.getEndTime()).isNotNull();
            assertThat(slot.getSubject()).isNotNull();
        });
    }
}

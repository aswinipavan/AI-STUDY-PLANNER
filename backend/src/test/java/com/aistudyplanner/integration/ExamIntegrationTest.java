package com.aistudyplanner.integration;

import com.aistudyplanner.model.dto.request.ExamRequest;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import com.aistudyplanner.security.JwtTokenProvider;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end integration test for exam creation, written to lock in the fix for the
 * {@code POST /api/exams → HTTP 500} failure.
 *
 * <p>Root cause of the 500: the {@link com.aistudyplanner.model.entity.Exam} entity carries
 * {@code difficulty} and {@code notes} columns, but the original {@code exams} table (V1 migration /
 * {@code schema-local.sql}) never defined them. Persisting an exam that set those fields therefore
 * blew up at the JDBC layer. The durable fix adds the columns (V5 migration + schema-local.sql) so
 * the entity and the schema agree.
 *
 * <p>This test boots the full application on a random port and exercises the real chain over HTTP
 * with a genuine application JWT (the same {@link JwtTokenProvider} the login flow uses), so the real
 * {@code FirebaseTokenFilter} authenticates a persisted {@link Student} — no Firebase mocking or auth
 * bypass. It asserts the exam is created (201, not 500) and that {@code difficulty} + {@code notes}
 * survive a create-then-GET round-trip, proving they were actually written to (and read back from)
 * the database rather than merely echoed by the request handler.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(locations = "classpath:application-test.properties")
@DisplayName("Exam creation integration — difficulty & notes round-trip (HTTP 500 regression)")
class ExamIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private Student persistStudent() {
        return studentRepository.save(Student.builder()
                .firebaseUid("exam-it-" + UUID.randomUUID())
                .email("exam-" + UUID.randomUUID() + "@example.com")
                .fullName("Exam Test User")
                .build());
    }

    private Subject persistSubject(Student student) {
        return subjectRepository.save(Subject.builder()
                .student(student)
                .subjectName("Data Structures")
                .subjectCode("CS201")
                .credits(4)
                .semester(6)
                .build());
    }

    private HttpHeaders bearer(Student student) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtTokenProvider.generateToken(student.getId(), student.getFirebaseUid()));
        return headers;
    }

    private HttpHeaders bearerJson(Student student) {
        HttpHeaders headers = bearer(student);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    @Test
    @DisplayName("POST /api/exams persists difficulty + notes and returns 201 (no HTTP 500)")
    void createExamRoundTripsDifficultyAndNotes() {
        Student student = persistStudent();
        Subject subject = persistSubject(student);

        ExamRequest request = ExamRequest.builder()
                .subjectId(subject.getId())
                .examName("Midterm 1")
                .examDate(LocalDate.now().plusDays(30))
                .examType("MIDTERM")
                .durationHours(new BigDecimal("2.0"))
                .syllabusCovered("Chapters 1-5")
                .difficulty("medium")
                .notes("Focus on trees and graphs")
                .build();

        ResponseEntity<String> created = restTemplate.postForEntity(
                "/api/exams", new HttpEntity<>(toJson(request), bearerJson(student)), String.class);

        assertThat(created.getStatusCode().value()).as("create exam status").isEqualTo(201);

        JsonNode data = readData(created.getBody());
        String examId = data.path("id").asText();
        assertThat(examId).as("created exam id").isNotBlank();
        assertThat(data.path("examName").asText()).isEqualTo("Midterm 1");
        assertThat(data.path("subject").path("id").asText()).isEqualTo(subject.getId().toString());
        assertThat(data.path("difficulty").asText()).as("difficulty in create response").isEqualTo("medium");
        assertThat(data.path("notes").asText()).as("notes in create response")
                .isEqualTo("Focus on trees and graphs");

        // Fetch the full list and confirm the two columns actually persisted (read back from the DB,
        // not merely reflected off the request body).
        ResponseEntity<String> all = restTemplate.exchange(
                "/api/exams", HttpMethod.GET, new HttpEntity<>(bearer(student)), String.class);
        assertThat(all.getStatusCode().value()).as("list exams status").isEqualTo(200);

        JsonNode list = readData(all.getBody());
        assertThat(list.isArray()).as("exam list payload is an array").isTrue();

        JsonNode persisted = null;
        for (JsonNode node : list) {
            if (examId.equals(node.path("id").asText())) {
                persisted = node;
                break;
            }
        }
        assertThat(persisted).as("created exam present in persisted list").isNotNull();
        assertThat(persisted.path("difficulty").asText()).as("difficulty persisted").isEqualTo("medium");
        assertThat(persisted.path("notes").asText()).as("notes persisted")
                .isEqualTo("Focus on trees and graphs");
    }

    @Test
    @DisplayName("Rejects an unauthenticated exam creation (auth is enforced, not bypassed)")
    void createExamRequiresAuthentication() {
        ExamRequest request = ExamRequest.builder()
                .subjectId(UUID.randomUUID())
                .examName("No Auth Exam")
                .examDate(LocalDate.now().plusDays(10))
                .difficulty("easy")
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/exams", new HttpEntity<>(toJson(request), headers), String.class);

        assertThat(response.getStatusCode().value()).isIn(401, 403);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new AssertionError("Failed to serialise request body", e);
        }
    }

    private JsonNode readData(String responseBody) {
        try {
            return objectMapper.readTree(responseBody).path("data");
        } catch (IOException e) {
            throw new AssertionError("Response was not valid JSON: " + responseBody, e);
        }
    }
}

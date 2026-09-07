package com.aistudyplanner.controller;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.VerificationStatus;
import com.aistudyplanner.model.dto.request.ApproveCompletionRequest;
import com.aistudyplanner.model.dto.response.SlotResponse;
import com.aistudyplanner.model.dto.response.StudyEvidenceResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.service.AdaptiveScheduleService;
import com.aistudyplanner.service.StudyEvidenceVerificationService;
import com.aistudyplanner.service.TimetableService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseAuth;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TimetableController.class)
@DisplayName("Timetable Evidence Controller Integration Tests")
class TimetableEvidenceControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FirebaseAuth firebaseAuth;

    @MockBean
    private com.aistudyplanner.security.JwtTokenProvider jwtTokenProvider;

    @MockBean
    private StudentRepository studentRepository;

    @MockBean
    private TimetableService timetableService;

    @MockBean
    private AdaptiveScheduleService adaptiveScheduleService;

    @MockBean
    private StudyEvidenceVerificationService studyEvidenceVerificationService;

    private Student mockStudent;
    private UUID studentId;
    private UUID slotId;
    private UUID evidenceId;

    private RequestPostProcessor authenticatedStudent() {
        return authentication(new UsernamePasswordAuthenticationToken(
                mockStudent,
                null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
        ));
    }

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        slotId = UUID.randomUUID();
        evidenceId = UUID.randomUUID();

        mockStudent = Student.builder()
                .id(studentId)
                .firebaseUid("test-student-uid-evidence")
                .email("student.evidence@example.com")
                .fullName("Evidence Testing Student")
                .build();
    }

    @Test
    @DisplayName("A. POST evidence for valid authenticated student -> 200 with verification result")
    void testSubmitEvidenceSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes_proof.pdf",
                "application/pdf",
                "Proof content verifying TCP handshake".getBytes()
        );

        StudyEvidenceResponse mockResponse = StudyEvidenceResponse.builder()
                .id(evidenceId)
                .slotId(slotId)
                .fileName("notes_proof.pdf")
                .fileUrl("http://storage.local/evidence/notes_proof.pdf")
                .verificationStatus(VerificationStatus.APPROVED)
                .score(88)
                .summary("Clear notes on TCP 3-way handshake")
                .matchedTopics(List.of("TCP Handshake"))
                .missingTopics(Collections.emptyList())
                .feedback("Good derivations")
                .confidence(95)
                .submittedAt(OffsetDateTime.now())
                .isUsedForCompletion(false)
                .build();

        when(studyEvidenceVerificationService.submitAndVerifyEvidence(eq(studentId), eq(slotId), any()))
                .thenReturn(mockResponse);

        mockMvc.perform(multipart("/api/timetable/slots/{slotId}/evidence", slotId)
                        .file(file)
                        .with(authenticatedStudent())
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(evidenceId.toString()))
                .andExpect(jsonPath("$.data.verificationStatus").value("APPROVED"))
                .andExpect(jsonPath("$.data.score").value(88))
                .andExpect(jsonPath("$.data.matchedTopics[0]").value("TCP Handshake"));
    }

    @Test
    @DisplayName("B. GET latest evidence for slot -> 200 with evidence data")
    void testGetLatestEvidenceSuccess() throws Exception {
        StudyEvidenceResponse mockResponse = StudyEvidenceResponse.builder()
                .id(evidenceId)
                .slotId(slotId)
                .fileName("notes_proof.pdf")
                .verificationStatus(VerificationStatus.APPROVED)
                .score(90)
                .build();

        when(studyEvidenceVerificationService.getLatestEvidenceForSlot(eq(studentId), eq(slotId)))
                .thenReturn(mockResponse);

        mockMvc.perform(get("/api/timetable/slots/{slotId}/evidence", slotId)
                        .with(authenticatedStudent()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(evidenceId.toString()))
                .andExpect(jsonPath("$.data.score").value(90));
    }

    @Test
    @DisplayName("C. POST evidence for unknown slot -> 404 Not Found")
    void testSubmitEvidenceUnknownSlotReturns404() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.pdf",
                "application/pdf",
                "content".getBytes()
        );

        when(studyEvidenceVerificationService.submitAndVerifyEvidence(eq(studentId), eq(slotId), any()))
                .thenThrow(new ResourceNotFoundException("Slot not found"));

        mockMvc.perform(multipart("/api/timetable/slots/{slotId}/evidence", slotId)
                        .file(file)
                        .with(authenticatedStudent())
                        .with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("D. POST evidence for slot belonging to another student -> rejected with 400 Bad Request")
    void testSubmitEvidenceOtherStudentSlotRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.pdf",
                "application/pdf",
                "content".getBytes()
        );

        when(studyEvidenceVerificationService.submitAndVerifyEvidence(eq(studentId), eq(slotId), any()))
                .thenThrow(new IllegalArgumentException("Slot does not belong to student"));

        mockMvc.perform(multipart("/api/timetable/slots/{slotId}/evidence", slotId)
                        .file(file)
                        .with(authenticatedStudent())
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("E. POST evidence for future slot -> rejected with 400 Bad Request")
    void testSubmitEvidenceFutureSlotRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.pdf",
                "application/pdf",
                "content".getBytes()
        );

        when(studyEvidenceVerificationService.submitAndVerifyEvidence(eq(studentId), eq(slotId), any()))
                .thenThrow(new IllegalArgumentException("Cannot submit study proof for a future session"));

        mockMvc.perform(multipart("/api/timetable/slots/{slotId}/evidence", slotId)
                        .file(file)
                        .with(authenticatedStudent())
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("F. POST approve-completion with valid approved evidence -> 200 OK")
    void testApproveCompletionSuccess() throws Exception {
        ApproveCompletionRequest request = ApproveCompletionRequest.builder()
                .evidenceId(evidenceId)
                .build();

        SlotResponse mockSlotResponse = SlotResponse.builder()
                .id(slotId)
                .isCompleted(true)
                .status("completed")
                .hasEvidence(true)
                .evidenceStatus("APPROVED")
                .evidenceScore(88)
                .evidenceId(evidenceId)
                .build();

        when(timetableService.approveSlotCompletion(eq(studentId), eq(slotId), eq(evidenceId)))
                .thenReturn(mockSlotResponse);

        mockMvc.perform(post("/api/timetable/slots/{slotId}/approve-completion", slotId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(authenticatedStudent())
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isCompleted").value(true))
                .andExpect(jsonPath("$.data.evidenceStatus").value("APPROVED"));
    }

    @Test
    @DisplayName("G. POST approve-completion without evidenceId -> 400 Bad Request")
    void testApproveCompletionMissingEvidenceId() throws Exception {
        ApproveCompletionRequest request = ApproveCompletionRequest.builder()
                .evidenceId(null)
                .build();

        mockMvc.perform(post("/api/timetable/slots/{slotId}/approve-completion", slotId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(authenticatedStudent())
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("H. POST approve-completion with forged/non-approved evidence -> 400 Bad Request")
    void testApproveCompletionForgedEvidenceRejected() throws Exception {
        ApproveCompletionRequest request = ApproveCompletionRequest.builder()
                .evidenceId(evidenceId)
                .build();

        when(timetableService.approveSlotCompletion(eq(studentId), eq(slotId), eq(evidenceId)))
                .thenThrow(new IllegalArgumentException("Cannot complete session: evidence verification status is NEEDS_MORE_WORK"));

        mockMvc.perform(post("/api/timetable/slots/{slotId}/approve-completion", slotId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(authenticatedStudent())
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}

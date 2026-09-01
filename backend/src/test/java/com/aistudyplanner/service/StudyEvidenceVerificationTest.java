package com.aistudyplanner.service;

import com.aistudyplanner.model.VerificationStatus;
import com.aistudyplanner.model.dto.response.SlotResponse;
import com.aistudyplanner.model.dto.response.StudyEvidenceResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.StudyEvidenceSubmission;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.model.entity.Timetable;
import com.aistudyplanner.model.entity.TimetableSlot;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.StudyEvidenceSubmissionRepository;
import com.aistudyplanner.repository.TimetableRepository;
import com.aistudyplanner.repository.TimetableSlotRepository;
import com.aistudyplanner.service.ai.AiCompletion;
import com.aistudyplanner.service.ai.AiProviderGateway;
import com.aistudyplanner.service.ai.AiRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudyEvidenceVerificationTest {

    @Mock
    private TimetableSlotRepository timetableSlotRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private StudyEvidenceSubmissionRepository evidenceRepository;

    @Mock
    private StorageService storageService;

    @Mock
    private AiProviderGateway aiProviderGateway;

    @Mock
    private MaterialTopicReader materialTopicReader;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private StudyEvidenceVerificationService verificationService;
    private TimetableService timetableService;

    private UUID studentId;
    private UUID slotId;
    private Student mockStudent;
    private Timetable mockTimetable;
    private TimetableSlot mockSlot;
    private Subject mockSubject;

    @BeforeEach
    void setUp() {
        verificationService = new StudyEvidenceVerificationService(
                timetableSlotRepository,
                studentRepository,
                evidenceRepository,
                storageService,
                aiProviderGateway,
                materialTopicReader,
                objectMapper
        );

        timetableService = new TimetableService(
                mock(TimetableRepository.class),
                timetableSlotRepository,
                mock(com.aistudyplanner.repository.SubjectRepository.class),
                mock(com.aistudyplanner.repository.MarksRepository.class),
                mock(com.aistudyplanner.repository.ExamRepository.class),
                studentRepository,
                materialTopicReader,
                mock(GroqService.class),
                evidenceRepository
        );

        studentId = UUID.randomUUID();
        slotId = UUID.randomUUID();

        mockStudent = Student.builder()
                .id(studentId)
                .email("student@studyplanner.com")
                .fullName("Alex Student")
                .studyStreak(3)
                .lastActiveDate(LocalDate.now().minusDays(1))
                .build();

        mockTimetable = Timetable.builder()
                .id(UUID.randomUUID())
                .student(mockStudent)
                .weekStartDate(LocalDate.now())
                .isActive(true)
                .build();

        mockSubject = Subject.builder()
                .id(UUID.randomUUID())
                .student(mockStudent)
                .subjectName("Engineering Mathematics")
                .build();

        mockSlot = TimetableSlot.builder()
                .id(slotId)
                .timetable(mockTimetable)
                .subject(mockSubject)
                .slotDate(LocalDate.now())
                .dayOfWeek(0)
                .startTime(LocalTime.of(17, 0))
                .endTime(LocalTime.of(18, 0))
                .topic("Eigenvalues and Eigenvectors")
                .isCompleted(false)
                .build();
    }

    @Test
    @DisplayName("Case A: Valid evidence file matching assigned topic is APPROVED by AI Examiner")
    void testValidEvidenceApproved() {
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(mockStudent));
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        when(storageService.upload(eq("evidence"), anyString(), any(), anyString()))
                .thenReturn("http://storage.local/evidence/alex_math_proof.pdf");

        MaterialTopicReader.TopicDetail topicDetail = MaterialTopicReader.TopicDetail.builder()
                .chapter("Linear Algebra")
                .materialTitle("Advanced Engineering Mathematics")
                .whatToStudy(List.of("Characteristic polynomial", "Eigenvalues computation", "Eigenvectors derivation"))
                .difficulty("MEDIUM")
                .difficultyScore(65)
                .build();
        when(materialTopicReader.resolveTopicDetail(eq(studentId), any(), eq("Eigenvalues and Eigenvectors"), anyString()))
                .thenReturn(topicDetail);

        String aiJsonResponse = "{\n" +
                "  \"status\": \"APPROVED\",\n" +
                "  \"score\": 88,\n" +
                "  \"summary\": \"Clear step-by-step derivation of characteristic equations and eigenvector solutions.\",\n" +
                "  \"matchedTopics\": [\"Eigenvalues\", \"Characteristic Equation\", \"Eigenvectors\"],\n" +
                "  \"missingTopics\": [],\n" +
                "  \"feedback\": \"Excellent worked examples with full algebraic checks.\",\n" +
                "  \"confidence\": 95\n" +
                "}";

        when(aiProviderGateway.complete(any(AiRequest.class)))
                .thenReturn(new AiCompletion(aiJsonResponse, "groq", "test", 100L));

        when(evidenceRepository.save(any(StudyEvidenceSubmission.class)))
                .thenAnswer(invocation -> {
                    StudyEvidenceSubmission s = invocation.getArgument(0);
                    s.setId(UUID.randomUUID());
                    s.setSubmittedAt(OffsetDateTime.now());
                    return s;
                });

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "eigenvalues_solved_proof.txt",
                "text/plain",
                "Student Study Notes: Det(A - lambda*I) = 0. Found lambda1 = 3, lambda2 = 1. Solved for v1 and v2 successfully.".getBytes()
        );

        StudyEvidenceResponse response = verificationService.submitAndVerifyEvidence(studentId, slotId, file);

        assertThat(response).isNotNull();
        assertThat(response.getVerificationStatus()).isEqualTo(VerificationStatus.APPROVED);
        assertThat(response.getScore()).isEqualTo(88);
        assertThat(response.getMatchedTopics()).contains("Eigenvalues", "Characteristic Equation");
        assertThat(response.getConfidence()).isEqualTo(95);
    }

    @Test
    @DisplayName("Case B: Unrelated or incomplete evidence returns NEEDS_MORE_WORK")
    void testIncompleteEvidenceNeedsMoreWork() {
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(mockStudent));
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        when(storageService.upload(anyString(), anyString(), any(), anyString()))
                .thenReturn("http://storage.local/evidence/unrelated.txt");

        when(materialTopicReader.resolveTopicDetail(any(), any(), any(), any()))
                .thenReturn(MaterialTopicReader.TopicDetail.builder().build());

        String aiJsonResponse = "{\n" +
                "  \"status\": \"NEEDS_MORE_WORK\",\n" +
                "  \"score\": 45,\n" +
                "  \"summary\": \"Notes cover introductory definitions only and omit eigenvector calculation.\",\n" +
                "  \"matchedTopics\": [\"Matrix Definition\"],\n" +
                "  \"missingTopics\": [\"Eigenvalues\", \"Eigenvectors\"],\n" +
                "  \"feedback\": \"Include full characteristic equation calculations to demonstrate mastery.\",\n" +
                "  \"confidence\": 85\n" +
                "}";

        when(aiProviderGateway.complete(any(AiRequest.class)))
                .thenReturn(new AiCompletion(aiJsonResponse, "groq", "test", 100L));

        when(evidenceRepository.save(any(StudyEvidenceSubmission.class)))
                .thenAnswer(invocation -> {
                    StudyEvidenceSubmission s = invocation.getArgument(0);
                    s.setId(UUID.randomUUID());
                    return s;
                });

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.txt",
                "text/plain",
                "A matrix is a rectangular array of numbers.".getBytes()
        );

        StudyEvidenceResponse response = verificationService.submitAndVerifyEvidence(studentId, slotId, file);

        assertThat(response).isNotNull();
        assertThat(response.getVerificationStatus()).isEqualTo(VerificationStatus.NEEDS_MORE_WORK);
        assertThat(response.getScore()).isEqualTo(45);
        assertThat(response.getMissingTopics()).contains("Eigenvalues", "Eigenvectors");
    }

    @Test
    @DisplayName("Case C: Submitting proof for a future session throws IllegalArgumentException")
    void testFutureSessionSubmissionRejected() {
        mockSlot.setSlotDate(LocalDate.now().plusDays(2));

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(mockStudent));
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));

        MockMultipartFile file = new MockMultipartFile("file", "proof.pdf", "application/pdf", "dummy pdf content".getBytes());

        assertThatThrownBy(() -> verificationService.submitAndVerifyEvidence(studentId, slotId, file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot submit completion proof for future sessions");
    }

    @Test
    @DisplayName("Case D: Approving completion with APPROVED evidence marks slot complete & updates streak")
    void testApproveSlotCompletionSuccess() {
        UUID evidenceId = UUID.randomUUID();

        StudyEvidenceSubmission evidence = StudyEvidenceSubmission.builder()
                .id(evidenceId)
                .timetableSlot(mockSlot)
                .student(mockStudent)
                .verificationStatus(VerificationStatus.APPROVED)
                .score(92)
                .fileName("proof.pdf")
                .fileUrl("http://storage/proof.pdf")
                .isUsedForCompletion(false)
                .build();

        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        when(evidenceRepository.findByIdAndStudentId(evidenceId, studentId)).thenReturn(Optional.of(evidence));
        when(timetableSlotRepository.save(any(TimetableSlot.class))).thenAnswer(i -> i.getArgument(0));
        when(evidenceRepository.save(any(StudyEvidenceSubmission.class))).thenAnswer(i -> i.getArgument(0));

        when(materialTopicReader.resolveTopicDetail(any(), any(), any(), any()))
                .thenReturn(MaterialTopicReader.TopicDetail.builder().build());

        SlotResponse response = timetableService.approveSlotCompletion(studentId, slotId, evidenceId);

        assertThat(response.getIsCompleted()).isTrue();
        assertThat(mockStudent.getStudyStreak()).isEqualTo(4);
        assertThat(mockStudent.getLastActiveDate()).isEqualTo(LocalDate.now());
        assertThat(evidence.getIsUsedForCompletion()).isTrue();
    }

    @Test
    @DisplayName("Case E: Approving completion with NEEDS_MORE_WORK evidence is rejected with exception")
    void testApproveSlotCompletionRejectedWhenNotApproved() {
        UUID evidenceId = UUID.randomUUID();

        StudyEvidenceSubmission evidence = StudyEvidenceSubmission.builder()
                .id(evidenceId)
                .timetableSlot(mockSlot)
                .student(mockStudent)
                .verificationStatus(VerificationStatus.NEEDS_MORE_WORK)
                .score(50)
                .build();

        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        when(evidenceRepository.findByIdAndStudentId(evidenceId, studentId)).thenReturn(Optional.of(evidence));

        assertThatThrownBy(() -> timetableService.approveSlotCompletion(studentId, slotId, evidenceId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot complete session: evidence verification status is NEEDS_MORE_WORK");
    }

    @Test
    @DisplayName("Case F: Direct markSlotComplete without prior approved evidence is rejected (Anti-Bypass)")
    void testDirectMarkCompleteRejectedWithoutEvidence() {
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        when(evidenceRepository.findTopByTimetableSlotIdAndStudentIdOrderBySubmittedAtDesc(slotId, studentId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> timetableService.markSlotComplete(studentId, slotId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot complete session without approved study proof evidence");
    }

    @Test
    @DisplayName("Case G: Direct markSlotComplete with prior approved evidence succeeds")
    void testDirectMarkCompleteWithApprovedEvidenceSucceeds() {
        StudyEvidenceSubmission approvedEvidence = StudyEvidenceSubmission.builder()
                .id(UUID.randomUUID())
                .timetableSlot(mockSlot)
                .student(mockStudent)
                .verificationStatus(VerificationStatus.APPROVED)
                .score(85)
                .isUsedForCompletion(false)
                .build();

        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        when(evidenceRepository.findTopByTimetableSlotIdAndStudentIdOrderBySubmittedAtDesc(slotId, studentId))
                .thenReturn(Optional.of(approvedEvidence));
        when(timetableSlotRepository.save(any(TimetableSlot.class))).thenAnswer(i -> i.getArgument(0));
        when(materialTopicReader.resolveTopicDetail(any(), any(), any(), any()))
                .thenReturn(MaterialTopicReader.TopicDetail.builder().build());

        SlotResponse response = timetableService.markSlotComplete(studentId, slotId);

        assertThat(response.getIsCompleted()).isTrue();
        assertThat(approvedEvidence.getIsUsedForCompletion()).isTrue();
    }
}

package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.request.CompleteRevisionRequest;
import com.aistudyplanner.model.dto.response.SlotRevisionResponse;
import com.aistudyplanner.model.entity.*;
import com.aistudyplanner.repository.MaterialRepository;
import com.aistudyplanner.repository.SlotRevisionRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.TimetableSlotRepository;
import com.aistudyplanner.service.ai.AiCompletion;
import com.aistudyplanner.service.ai.AiProviderGateway;
import com.aistudyplanner.service.ai.AiRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SlotRevisionServiceTest {

    @Mock
    private SlotRevisionRepository slotRevisionRepository;

    @Mock
    private TimetableSlotRepository timetableSlotRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private MaterialRepository materialRepository;

    @Mock
    private MaterialTopicReader materialTopicReader;

    @Mock
    private AiProviderGateway aiProviderGateway;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private SlotRevisionService slotRevisionService;

    private UUID studentId;
    private UUID slotId;
    private Student student;
    private Subject subject;
    private TimetableSlot slot;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        slotId = UUID.randomUUID();

        student = Student.builder()
                .id(studentId)
                .firebaseUid("test-uid")
                .fullName("Aswini Pavan")
                .build();

        subject = Subject.builder()
                .id(UUID.randomUUID())
                .subjectName("Operating Systems")
                .student(student)
                .build();

        Timetable timetable = Timetable.builder()
                .id(UUID.randomUUID())
                .student(student)
                .build();

        slot = TimetableSlot.builder()
                .id(slotId)
                .timetable(timetable)
                .subject(subject)
                .topic("Virtual Memory & Paging")
                .slotDate(LocalDate.now())
                .isCompleted(true)
                .build();
    }

    @Test
    @DisplayName("Returns existing SlotRevision if already generated")
    void returnsExistingRevision() {
        SlotRevision existing = SlotRevision.builder()
                .id(UUID.randomUUID())
                .student(student)
                .timetableSlot(slot)
                .topic("Virtual Memory & Paging")
                .summary("Existing summary of virtual memory.")
                .keyConcepts("[\"Paging\", \"Page Fault\"]")
                .importantFormulas("[{\"name\":\"Page Fault Rate\",\"formula\":\"PFR = PF / TotalAccesses\",\"explanation\":\"Measures page fault ratio\"}]")
                .quizQuestions("[{\"id\":1,\"question\":\"What is a page fault?\",\"options\":[\"Page not in RAM\",\"Disk failure\",\"CPU error\",\"None\"],\"correctOptionIndex\":0,\"explanation\":\"Page not loaded into physical frame.\"}]")
                .weakAreas("[\"Overlooking TLB hit ratio\"]")
                .quickRevisionPoints("[\"Paging eliminates external fragmentation\"]")
                .score(80)
                .isCompleted(true)
                .build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(slot));
        when(slotRevisionRepository.findByTimetableSlotIdAndStudentId(slotId, studentId)).thenReturn(Optional.of(existing));

        SlotRevisionResponse response = slotRevisionService.getOrGenerateRevision(studentId, slotId);

        assertThat(response).isNotNull();
        assertThat(response.getTopic()).isEqualTo("Virtual Memory & Paging");
        assertThat(response.getSummary()).isEqualTo("Existing summary of virtual memory.");
        assertThat(response.getKeyConcepts()).containsExactly("Paging", "Page Fault");
        assertThat(response.getQuizQuestions()).hasSize(1);
        assertThat(response.getScore()).isEqualTo(80);
        assertThat(response.getIsCompleted()).isTrue();
        verifyNoInteractions(aiProviderGateway);
    }

    @Test
    @DisplayName("Rejects revision request for uncompleted session")
    void rejectsUncompletedSession() {
        slot.setIsCompleted(false);

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(slot));

        assertThatThrownBy(() -> slotRevisionService.getOrGenerateRevision(studentId, slotId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Revision mode is only available for completed and verified sessions");
    }

    @Test
    @DisplayName("Generates new revision experience via AI gateway and stores it")
    void generatesNewRevisionViaAi() {
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(slot));
        when(slotRevisionRepository.findByTimetableSlotIdAndStudentId(slotId, studentId)).thenReturn(Optional.empty());

        MaterialTopicReader.TopicDetail detail = MaterialTopicReader.TopicDetail.builder()
                .topic("Virtual Memory & Paging")
                .chapter("Chapter 8")
                .whatToStudy(List.of("Study paging mechanisms", "Analyze TLB hits"))
                .build();
        when(materialTopicReader.resolveTopicDetail(eq(studentId), any(), any(), any())).thenReturn(detail);
        when(materialRepository.findAllByStudentIdAndSubjectId(eq(studentId), any())).thenReturn(Collections.emptyList());

        String aiJson = """
                {
                  "summary": "Virtual memory maps virtual addresses to physical pages seamlessly.",
                  "keyConcepts": ["Paging", "TLB", "Demand Paging", "Page Replacement"],
                  "importantFormulas": [
                    { "name": "Effective Access Time", "formula": "EAT = (1-p)m + p(s)", "explanation": "Calculates memory access latency" }
                  ],
                  "quizQuestions": [
                    { "id": 1, "question": "Q1?", "options": ["A", "B", "C", "D"], "correctOptionIndex": 0, "explanation": "Exp 1" },
                    { "id": 2, "question": "Q2?", "options": ["A", "B", "C", "D"], "correctOptionIndex": 1, "explanation": "Exp 2" },
                    { "id": 3, "question": "Q3?", "options": ["A", "B", "C", "D"], "correctOptionIndex": 2, "explanation": "Exp 3" },
                    { "id": 4, "question": "Q4?", "options": ["A", "B", "C", "D"], "correctOptionIndex": 3, "explanation": "Exp 4" },
                    { "id": 5, "question": "Q5?", "options": ["A", "B", "C", "D"], "correctOptionIndex": 0, "explanation": "Exp 5" }
                  ],
                  "weakAreas": ["Confusing paging with segmentation"],
                  "quickRevisionPoints": ["TLB avoids double memory lookup", "Page fault triggers OS trap"]
                }
                """;

        when(aiProviderGateway.complete(any(AiRequest.class)))
                .thenReturn(new AiCompletion(aiJson, "groq", "llama3", 200));

        when(slotRevisionRepository.save(any(SlotRevision.class))).thenAnswer(inv -> {
            SlotRevision r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        SlotRevisionResponse response = slotRevisionService.getOrGenerateRevision(studentId, slotId);

        assertThat(response).isNotNull();
        assertThat(response.getSummary()).contains("Virtual memory maps");
        assertThat(response.getKeyConcepts()).contains("Paging", "TLB");
        assertThat(response.getQuizQuestions()).hasSize(5);
        assertThat(response.getImportantFormulas()).hasSize(1);
        assertThat(response.getIsCompleted()).isFalse();
    }

    @Test
    @DisplayName("Falls back gracefully to deterministic curriculum generator when AI gateway fails")
    void fallbackGeneratorWhenAiFails() {
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(slot));
        when(slotRevisionRepository.findByTimetableSlotIdAndStudentId(slotId, studentId)).thenReturn(Optional.empty());

        MaterialTopicReader.TopicDetail detail = MaterialTopicReader.TopicDetail.builder()
                .topic("Virtual Memory & Paging")
                .chapter("Chapter 8")
                .whatToStudy(List.of("Study paging mechanisms"))
                .build();
        when(materialTopicReader.resolveTopicDetail(eq(studentId), any(), any(), any())).thenReturn(detail);
        when(materialRepository.findAllByStudentIdAndSubjectId(eq(studentId), any())).thenReturn(Collections.emptyList());

        when(aiProviderGateway.complete(any(AiRequest.class)))
                .thenThrow(new RuntimeException("Groq API unavailable"));

        when(slotRevisionRepository.save(any(SlotRevision.class))).thenAnswer(inv -> {
            SlotRevision r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        SlotRevisionResponse response = slotRevisionService.getOrGenerateRevision(studentId, slotId);

        assertThat(response).isNotNull();
        assertThat(response.getSummary()).contains("High-yield revision for Virtual Memory & Paging");
        assertThat(response.getQuizQuestions()).hasSize(5);
        assertThat(response.getImportantFormulas()).isNotEmpty();
        assertThat(response.getQuickRevisionPoints()).isNotEmpty();
    }

    @Test
    @DisplayName("Completes revision session and records score without modifying timetable slot completion rules")
    void completesRevisionSession() {
        SlotRevision revision = SlotRevision.builder()
                .id(UUID.randomUUID())
                .student(student)
                .timetableSlot(slot)
                .topic("Virtual Memory & Paging")
                .summary("Summary")
                .isCompleted(false)
                .build();

        when(slotRevisionRepository.findByTimetableSlotIdAndStudentId(slotId, studentId)).thenReturn(Optional.of(revision));
        when(slotRevisionRepository.save(any(SlotRevision.class))).thenAnswer(inv -> inv.getArgument(0));

        CompleteRevisionRequest request = CompleteRevisionRequest.builder()
                .score(100)
                .build();

        SlotRevisionResponse response = slotRevisionService.completeRevision(studentId, slotId, request);

        assertThat(response.getIsCompleted()).isTrue();
        assertThat(response.getScore()).isEqualTo(100);
        assertThat(response.getCompletedAt()).isNotNull();
    }
}

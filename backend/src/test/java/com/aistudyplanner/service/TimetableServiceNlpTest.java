package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.request.GenerateTimetableRequest;
import com.aistudyplanner.model.dto.response.TimetableResponse;
import com.aistudyplanner.model.entity.*;
import com.aistudyplanner.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TimetableServiceNlpTest {

    @Mock
    private TimetableRepository timetableRepository;
    @Mock
    private TimetableSlotRepository timetableSlotRepository;
    @Mock
    private SubjectRepository subjectRepository;
    @Mock
    private MarksRepository marksRepository;
    @Mock
    private ExamRepository examRepository;
    @Mock
    private StudentRepository studentRepository;
    @Mock
    private MaterialRepository materialRepository;
    @Mock
    private GroqService groqService;

    private ObjectMapper objectMapper;
    private TimetableService timetableService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        timetableService = new TimetableService(
                timetableRepository,
                timetableSlotRepository,
                subjectRepository,
                marksRepository,
                examRepository,
                studentRepository,
                materialRepository,
                groqService,
                objectMapper
        );
    }

    @Test
    void testTimetableGeneration_UsesExtractedMaterialTopics() throws Exception {
        UUID studentId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();

        Student student = Student.builder().id(studentId).fullName("Aswin Student").build();
        Subject subject = Subject.builder()
                .id(subjectId)
                .student(student)
                .subjectName("Artificial Intelligence")
                .difficultyLevel(3)
                .build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(subjectRepository.findAllByStudentId(eq(studentId), any(PageRequest.class)))
                .thenReturn(List.of(subject));

        // Average score is low (45%) -> triggers priority focus
        when(marksRepository.findAveragePercentageBySubject(studentId))
                .thenReturn(List.<Object[]>of(new Object[]{subjectId, 45.0}));

        // Mock material with extracted topics
        List<Map<String, Object>> extractedTopics = List.of(
                Map.of("name", "A* Search Algorithm", "chapter", "Chapter 2 - Heuristic Search", "relevanceScore", 0.95),
                Map.of("name", "Minimax & Alpha-Beta Pruning", "chapter", "Chapter 3 - Adversarial Search", "relevanceScore", 0.85)
        );
        Material material = Material.builder()
                .id(UUID.randomUUID())
                .student(student)
                .subject(subject)
                .title("AI Coursebook")
                .extractedTopics(objectMapper.writeValueAsString(extractedTopics))
                .build();

        when(materialRepository.findAllByStudentIdAndSubjectId(studentId, subjectId))
                .thenReturn(List.of(material));

        Timetable savedTimetable = Timetable.builder()
                .id(UUID.randomUUID())
                .student(student)
                .weekStartDate(LocalDate.now())
                .title("Study Plan")
                .isAiGenerated(true)
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build();

        when(timetableRepository.save(any(Timetable.class))).thenReturn(savedTimetable);
        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId)).thenReturn(Optional.of(savedTimetable));

        GenerateTimetableRequest request = new GenerateTimetableRequest();
        request.setStartDate(LocalDate.now());
        request.setDurationDays(3);
        request.setAvailableHoursPerDay(2);
        request.setStyle("balanced");
        request.setSubjectIds(List.of(subjectId));

        TimetableResponse response = timetableService.generateAiTimetable(studentId, request);
        assertNotNull(response);

        // Verify slots saved with material topics
        verify(timetableSlotRepository).saveAll(argThat((List<TimetableSlot> slots) -> {
            assertFalse(slots.isEmpty());
            boolean hasMaterialTopic = slots.stream().anyMatch(s ->
                    s.getTopic() != null && (s.getTopic().contains("A* Search") || s.getTopic().contains("Heuristic Search")));
            assertTrue(hasMaterialTopic, "Slot topic should contain real extracted material topic");
            return true;
        }));
    }
}

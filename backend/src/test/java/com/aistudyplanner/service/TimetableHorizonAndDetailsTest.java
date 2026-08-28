package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.request.GenerateTimetableRequest;
import com.aistudyplanner.model.dto.response.SlotResponse;
import com.aistudyplanner.model.dto.response.TimetableResponse;
import com.aistudyplanner.model.entity.*;
import com.aistudyplanner.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TimetableHorizonAndDetailsTest {

    @Mock private TimetableRepository timetableRepository;
    @Mock private TimetableSlotRepository timetableSlotRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private MarksRepository marksRepository;
    @Mock private ExamRepository examRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private MaterialRepository materialRepository;
    @Mock private GroqService groqService;

    private ObjectMapper objectMapper;
    private MaterialTopicReader materialTopicReader;
    private TimetableService timetableService;

    private UUID studentId;
    private Student student;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        materialTopicReader = new MaterialTopicReader(materialRepository, objectMapper);
        timetableService = new TimetableService(
                timetableRepository, timetableSlotRepository, subjectRepository, marksRepository,
                examRepository, studentRepository, materialTopicReader, groqService);

        studentId = UUID.randomUUID();
        student = Student.builder()
                .id(studentId)
                .fullName("Aswini Lead")
                .preferredStudyTime("MORNING") // 6:00 AM start
                .availableHoursPerDay(java.math.BigDecimal.valueOf(1.0))
                .build();
    }

    @Test
    @DisplayName("Requirement A: 14-day exam creates complete 14-day contiguous calendar")
    void fourteenDayExam_createsFourteenDayPlan() {
        LocalDate startDate = LocalDate.of(2026, 8, 27);
        LocalDate examDate = startDate.plusDays(14); // 2026-09-10
        UUID subjectId = UUID.randomUUID();
        Subject math = Subject.builder().id(subjectId).student(student)
                .subjectName("Discrete Maths").difficultyLevel(3).build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(subjectRepository.findAllByStudentId(eq(studentId), any(PageRequest.class)))
                .thenReturn(List.of(math));

        Exam exam = Exam.builder().id(UUID.randomUUID()).student(student).subject(math)
                .examName("Final Exam").examDate(examDate).build();
        when(examRepository.findAllByStudentIdOrderByExamDateAsc(eq(studentId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(exam)));

        Timetable saved = Timetable.builder()
                .id(UUID.randomUUID()).student(student).weekStartDate(startDate)
                .title("14-Day Plan").isAiGenerated(true).isActive(true).build();
        when(timetableRepository.save(any(Timetable.class))).thenReturn(saved);
        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId)).thenReturn(Optional.of(saved));

        GenerateTimetableRequest request = GenerateTimetableRequest.builder()
                .startDate(startDate)
                .availableHoursPerDay(1)
                .style("balanced")
                .useDeadlines(true)
                .subjectIds(List.of(subjectId))
                .durationDays(14)
                .build();

        timetableService.generateAiTimetable(studentId, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TimetableSlot>> captor = ArgumentCaptor.forClass(List.class);
        verify(timetableSlotRepository).saveAll(captor.capture());
        List<TimetableSlot> slots = captor.getValue();

        assertThat(slots).isNotEmpty();
        List<LocalDate> distinctDates = slots.stream().map(TimetableSlot::getSlotDate).distinct().sorted().collect(Collectors.toList());
        assertEquals(14, distinctDates.size(), "Should span 14 distinct preparation days");
        assertEquals(startDate, distinctDates.get(0));
        assertEquals(examDate.minusDays(1), distinctDates.get(distinctDates.size() - 1));

        // Thursday Aug 27 and Thursday Sep 3 are distinct dates
        assertTrue(distinctDates.contains(LocalDate.of(2026, 8, 27)));
        assertTrue(distinctDates.contains(LocalDate.of(2026, 9, 3)));
    }

    @Test
    @DisplayName("Requirement F & G: User preferred start time (6:00 AM) and duration produces full start-end range")
    void slotTime_derivesFullStartEndRange() {
        LocalDate date = LocalDate.of(2026, 8, 27);
        UUID subjectId = UUID.randomUUID();
        Subject subject = Subject.builder().id(subjectId).student(student)
                .subjectName("Operating Systems").difficultyLevel(3).build();

        Timetable timetable = Timetable.builder().id(UUID.randomUUID()).student(student).isActive(true).weekStartDate(date).build();
        TimetableSlot slot = TimetableSlot.builder()
                .id(UUID.randomUUID())
                .timetable(timetable)
                .subject(subject)
                .slotDate(date)
                .startTime(LocalTime.of(6, 0))
                .endTime(LocalTime.of(7, 0))
                .topic("Memory Management")
                .isCompleted(false)
                .build();

        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId)).thenReturn(Optional.of(timetable));
        when(timetableSlotRepository.findAllByTimetableIdOrderBySlotDate(timetable.getId())).thenReturn(List.of(slot));

        TimetableResponse response = timetableService.getTimetable(studentId);
        assertThat(response.getSlots()).hasSize(1);
        SlotResponse slotResp = response.getSlots().get(0);

        assertEquals(LocalTime.of(6, 0), slotResp.getStartTime());
        assertEquals(LocalTime.of(7, 0), slotResp.getEndTime());
        assertEquals(60, slotResp.getDurationMinutes());
        assertEquals(date, slotResp.getDate());
    }

    @Test
    @DisplayName("Requirement I, J & K: Slot details are resolved from uploaded material topics & chapters")
    void slotDetails_resolvedFromUploadedMaterial() {
        LocalDate date = LocalDate.now();
        UUID subjectId = UUID.randomUUID();
        Subject subject = Subject.builder().id(subjectId).student(student)
                .subjectName("Discrete Maths").difficultyLevel(3).build();

        String topicsJson = "[{\"name\":\"Determinant calculation\",\"chapter\":\"Matrices\",\"keywords\":[\"determinant\",\"2x2\",\"3x3\",\"rules\"],\"relevanceScore\":0.95,\"estimatedMinutes\":45}]";
        String chaptersJson = "[{\"title\":\"Matrices\",\"chapterNumber\":\"1\",\"subtopics\":[\"Matrix representation\",\"Determinant calculation\"],\"contentSnippet\":\"Matrix fundamentals and determinants.\"}]";

        Material material = Material.builder()
                .id(UUID.randomUUID())
                .student(student)
                .subject(subject)
                .title("Applied Mathematics Assignment.pdf")
                .extractedTopics(topicsJson)
                .extractedChapters(chaptersJson)
                .overallDifficulty("HARD")
                .difficultyScore(85)
                .build();

        when(materialRepository.findAllByStudentIdAndSubjectId(studentId, subjectId)).thenReturn(List.of(material));

        Timetable timetable = Timetable.builder().id(UUID.randomUUID()).student(student).isActive(true).weekStartDate(date).build();
        TimetableSlot slot = TimetableSlot.builder()
                .id(UUID.randomUUID())
                .timetable(timetable)
                .subject(subject)
                .slotDate(date)
                .startTime(LocalTime.of(6, 0))
                .endTime(LocalTime.of(7, 0))
                .topic("Matrices - Determinant calculation")
                .isCompleted(false)
                .build();

        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId)).thenReturn(Optional.of(timetable));
        when(timetableSlotRepository.findAllByTimetableIdOrderBySlotDate(timetable.getId())).thenReturn(List.of(slot));

        TimetableResponse response = timetableService.getTimetable(studentId);
        SlotResponse slotResp = response.getSlots().get(0);

        assertEquals("Matrices - Determinant calculation", slotResp.getTopic());
        assertEquals("Matrices", slotResp.getChapter());
        assertEquals("Applied Mathematics Assignment.pdf", slotResp.getMaterialTitle());
        assertEquals(material.getId(), slotResp.getMaterialId());
        assertEquals("HARD", slotResp.getDifficulty());
        assertEquals(85, slotResp.getDifficultyScore());
        assertThat(slotResp.getWhatToStudy()).isNotEmpty();
        assertTrue(slotResp.getWhatToStudy().stream().anyMatch(p -> p.contains("determinant")));
    }

    @Test
    @DisplayName("Requirement L, M, N & O: Historical missed session is marked missed; catch-up session has isCatchUp flag")
    void missedAndCatchUpSession_statesArePreserved() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDate today = LocalDate.now();
        UUID subjectId = UUID.randomUUID();
        Subject subject = Subject.builder().id(subjectId).student(student)
                .subjectName("Discrete Maths").difficultyLevel(3).build();

        Timetable timetable = Timetable.builder().id(UUID.randomUUID()).student(student).isActive(true).weekStartDate(yesterday).build();

        // 1. Past uncompleted slot on yesterday -> status must be 'missed'
        TimetableSlot pastSlot = TimetableSlot.builder()
                .id(UUID.randomUUID())
                .timetable(timetable)
                .subject(subject)
                .slotDate(yesterday)
                .startTime(LocalTime.of(6, 0))
                .endTime(LocalTime.of(7, 0))
                .topic("Matrices - Matrix representation")
                .isCompleted(false)
                .build();

        // 2. Today's catch-up slot -> notes contains "Rescheduled from"
        TimetableSlot catchUpSlot = TimetableSlot.builder()
                .id(UUID.randomUUID())
                .timetable(timetable)
                .subject(subject)
                .slotDate(today)
                .startTime(LocalTime.of(6, 0))
                .endTime(LocalTime.of(7, 0))
                .topic("Matrices - Matrix representation")
                .isCompleted(false)
                .notes("Rescheduled from " + yesterday + " (missed session caught up)")
                .build();

        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId)).thenReturn(Optional.of(timetable));
        when(timetableSlotRepository.findAllByTimetableIdOrderBySlotDate(timetable.getId())).thenReturn(List.of(pastSlot, catchUpSlot));

        TimetableResponse response = timetableService.getTimetable(studentId);
        assertThat(response.getSlots()).hasSize(2);

        SlotResponse pastResp = response.getSlots().get(0);
        assertEquals("missed", pastResp.getStatus());
        assertEquals(yesterday, pastResp.getDate());

        SlotResponse todayResp = response.getSlots().get(1);
        assertEquals("pending", todayResp.getStatus());
        assertTrue(todayResp.getIsCatchUp());
        assertEquals(yesterday, todayResp.getMissedDate());
        assertThat(todayResp.getSelectionReason()).contains("Overdue Catch-up");
    }
}

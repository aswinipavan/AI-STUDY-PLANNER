package com.aistudyplanner.service;

import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.model.entity.Timetable;
import com.aistudyplanner.model.entity.TimetableSlot;
import com.aistudyplanner.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimetableFutureSlotLockTest {

    @Mock private TimetableRepository timetableRepository;
    @Mock private TimetableSlotRepository timetableSlotRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private MarksRepository marksRepository;
    @Mock private ExamRepository examRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private MaterialRepository materialRepository;
    @Mock private GroqService groqService;

    private TimetableService timetableService;
    private UUID studentId;
    private Student student;
    private Timetable timetable;
    private Subject subject;

    @BeforeEach
    void setUp() {
        timetableService = new TimetableService(
                timetableRepository,
                timetableSlotRepository,
                subjectRepository,
                marksRepository,
                examRepository,
                studentRepository,
                new MaterialTopicReader(materialRepository, new ObjectMapper()),
                groqService
        );

        studentId = UUID.randomUUID();
        student = Student.builder()
                .id(studentId)
                .email("student@test.com")
                .fullName("Test Student")
                .studyStreak(3)
                .lastActiveDate(LocalDate.now().minusDays(1))
                .build();

        timetable = Timetable.builder()
                .id(UUID.randomUUID())
                .student(student)
                .weekStartDate(LocalDate.now())
                .isActive(true)
                .build();

        subject = Subject.builder()
                .id(UUID.randomUUID())
                .subjectName("Mathematics")
                .student(student)
                .build();
    }

    @Test
    @DisplayName("Completing today's study slot succeeds and increments study streak")
    void completeTodaySlot_success() {
        UUID slotId = UUID.randomUUID();
        TimetableSlot todaySlot = TimetableSlot.builder()
                .id(slotId)
                .timetable(timetable)
                .subject(subject)
                .slotDate(LocalDate.now())
                .dayOfWeek(0)
                .startTime(LocalTime.of(17, 0))
                .endTime(LocalTime.of(18, 0))
                .isCompleted(false)
                .build();

        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(todaySlot));
        when(timetableSlotRepository.save(any(TimetableSlot.class))).thenAnswer(i -> i.getArgument(0));

        var response = timetableService.markSlotComplete(studentId, slotId);

        assertNotNull(response);
        assertEquals("completed", response.getStatus());
        assertEquals(4, student.getStudyStreak());
        assertEquals(LocalDate.now(), student.getLastActiveDate());
        verify(studentRepository).save(student);
    }

    @Test
    @DisplayName("Attempting to complete a future study slot is REJECTED with IllegalArgumentException and does not alter streak")
    void completeFutureSlot_rejected() {
        UUID slotId = UUID.randomUUID();
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        TimetableSlot futureSlot = TimetableSlot.builder()
                .id(slotId)
                .timetable(timetable)
                .subject(subject)
                .slotDate(tomorrow)
                .dayOfWeek(1)
                .startTime(LocalTime.of(17, 0))
                .endTime(LocalTime.of(18, 0))
                .isCompleted(false)
                .build();

        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(futureSlot));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                timetableService.markSlotComplete(studentId, slotId)
        );

        assertTrue(ex.getMessage().contains("Cannot complete a future study session scheduled for " + tomorrow));
        assertFalse(futureSlot.getIsCompleted());
        assertEquals(3, student.getStudyStreak());
        verify(timetableSlotRepository, never()).save(any());
        verify(studentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Past missed session can still be completed and triggers streak/activity update")
    void completePastSlot_success() {
        UUID slotId = UUID.randomUUID();
        LocalDate yesterday = LocalDate.now().minusDays(1);
        TimetableSlot pastSlot = TimetableSlot.builder()
                .id(slotId)
                .timetable(timetable)
                .subject(subject)
                .slotDate(yesterday)
                .dayOfWeek(0)
                .startTime(LocalTime.of(17, 0))
                .endTime(LocalTime.of(18, 0))
                .isCompleted(false)
                .build();

        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(pastSlot));
        when(timetableSlotRepository.save(any(TimetableSlot.class))).thenAnswer(i -> i.getArgument(0));

        var response = timetableService.markSlotComplete(studentId, slotId);

        assertNotNull(response);
        assertEquals("completed", response.getStatus());
        verify(timetableSlotRepository).save(pastSlot);
    }
}

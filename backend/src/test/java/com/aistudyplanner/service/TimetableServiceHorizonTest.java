package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.request.GenerateTimetableRequest;
import com.aistudyplanner.model.entity.*;
import com.aistudyplanner.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Verifies the planning horizon is derived dynamically from the actual exam deadline
 * (TODAY → EXAM DATE) with <b>no fixed maximum window</b>. The plan must span exactly the number of
 * preparation days remaining before the exam — a 7-day-away exam yields a 7-day plan, a 30-day a
 * 30-day plan, a 60-day a 60-day plan — and a long horizon must never be truncated to a shorter fixed
 * window (e.g. the old 14/28-day duration picker or the 30-day prioritisation cap).
 */
@ExtendWith(MockitoExtension.class)
public class TimetableServiceHorizonTest {

    @Mock private TimetableRepository timetableRepository;
    @Mock private TimetableSlotRepository timetableSlotRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private MarksRepository marksRepository;
    @Mock private ExamRepository examRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private MaterialRepository materialRepository;
    @Mock private GroqService groqService;

    private ObjectMapper objectMapper;
    private TimetableService timetableService;

    private UUID studentId;
    private Student student;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        timetableService = new TimetableService(
                timetableRepository, timetableSlotRepository, subjectRepository, marksRepository,
                examRepository, studentRepository,
                new MaterialTopicReader(materialRepository, objectMapper), groqService);

        studentId = UUID.randomUUID();
        student = Student.builder()
                .id(studentId)
                .fullName("Horizon Student")
                .preferredStudyTime("EVENING")
                .build();
    }

    /** Common wiring: one subject, one exam N days away, no explicit deadline/duration override. */
    private List<TimetableSlot> generatePlanForSingleExam(int daysAway, Integer requestedDurationDays) {
        LocalDate today = LocalDate.now();
        UUID subjectId = UUID.randomUUID();
        Subject subject = Subject.builder().id(subjectId).student(student)
                .subjectName("Data Structures").difficultyLevel(3).build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(subjectRepository.findAllByStudentId(eq(studentId), any(PageRequest.class)))
                .thenReturn(List.of(subject));

        Exam exam = Exam.builder().id(UUID.randomUUID()).student(student).subject(subject)
                .examName("Final").examDate(today.plusDays(daysAway)).build();
        when(examRepository.findAllByStudentIdOrderByExamDateAsc(eq(studentId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(exam)));

        Timetable saved = Timetable.builder()
                .id(UUID.randomUUID()).student(student).weekStartDate(today)
                .title("Study Plan").isAiGenerated(true).isActive(true).build();
        when(timetableRepository.save(any(Timetable.class))).thenReturn(saved);
        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId)).thenReturn(Optional.of(saved));

        GenerateTimetableRequest request = new GenerateTimetableRequest();
        request.setStartDate(today);
        request.setDurationDays(requestedDurationDays);   // a coarse picker value that must NOT cap the plan
        request.setUseDeadlines(true);                    // "auto-prioritise by exam dates" (frontend default)
        request.setTargetDeadlineDate(null);              // user did NOT type an explicit deadline
        request.setAvailableHoursPerDay(4);
        request.setStyle("balanced");
        request.setSubjectIds(List.of(subjectId));

        timetableService.generateAiTimetable(studentId, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TimetableSlot>> captor = ArgumentCaptor.forClass(List.class);
        verify(timetableSlotRepository).saveAll(captor.capture());
        return captor.getValue();
    }

    private void assertSpansExactly(List<TimetableSlot> slots, int expectedDays) {
        LocalDate today = LocalDate.now();
        assertFalse(slots.isEmpty(), "Slots must be generated");
        assertTrue(slots.stream().allMatch(s -> s.getSlotDate() != null), "Every slot must carry a concrete date");
        List<LocalDate> dates = slots.stream().map(TimetableSlot::getSlotDate)
                .distinct().sorted().collect(Collectors.toList());
        assertEquals(expectedDays, dates.size(),
                "Plan must span exactly " + expectedDays + " preparation days; got " + dates.size());
        assertEquals(today, dates.get(0), "Plan must start today");
        assertEquals(today.plusDays(expectedDays - 1L), dates.get(dates.size() - 1),
                "Plan must run up to the day before the exam");
        // No gaps: the days must be a contiguous run.
        for (int i = 0; i < dates.size(); i++) {
            assertEquals(today.plusDays(i), dates.get(i), "Preparation days must be contiguous with no gaps");
        }
    }

    @Test
    void examSevenDaysAway_producesSevenDayPlan() {
        assertSpansExactly(generatePlanForSingleExam(7, 14), 7);
    }

    @Test
    void examThirtyDaysAway_producesThirtyDayPlan() {
        assertSpansExactly(generatePlanForSingleExam(30, 14), 30);
    }

    @Test
    void examSixtyDaysAway_producesSixtyDayPlan_neverTruncatedToThirtyOrTheDurationPicker() {
        // The request asks for only 14 days AND the old prioritisation cap was 30 days; the 60-day
        // exam must override both and produce a full 60-day plan.
        assertSpansExactly(generatePlanForSingleExam(60, 14), 60);
    }

    @Test
    void ninetyDaysAway_producesNinetyDayPlan() {
        assertSpansExactly(generatePlanForSingleExam(90, 28), 90);
    }

    @Test
    void multipleExams_spanToLatestDeadline_andReviseOnTheEveOfEachInteriorExam() {
        LocalDate today = LocalDate.now();
        UUID mathId = UUID.randomUUID();
        UUID physId = UUID.randomUUID();
        Subject math = Subject.builder().id(mathId).student(student)
                .subjectName("Math").difficultyLevel(3).build();
        Subject phys = Subject.builder().id(physId).student(student)
                .subjectName("Physics").difficultyLevel(3).build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(subjectRepository.findAllByStudentId(eq(studentId), any(PageRequest.class)))
                .thenReturn(List.of(math, phys));

        // Math exam in 10 days (interior), Physics exam in 30 days (the furthest → sets the horizon).
        Exam mathExam = Exam.builder().id(UUID.randomUUID()).student(student).subject(math)
                .examName("Math Mid").examDate(today.plusDays(10)).build();
        Exam physExam = Exam.builder().id(UUID.randomUUID()).student(student).subject(phys)
                .examName("Physics Final").examDate(today.plusDays(30)).build();
        when(examRepository.findAllByStudentIdOrderByExamDateAsc(eq(studentId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(mathExam, physExam)));

        Timetable saved = Timetable.builder()
                .id(UUID.randomUUID()).student(student).weekStartDate(today)
                .title("Study Plan").isAiGenerated(true).isActive(true).build();
        when(timetableRepository.save(any(Timetable.class))).thenReturn(saved);
        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId)).thenReturn(Optional.of(saved));

        GenerateTimetableRequest request = new GenerateTimetableRequest();
        request.setStartDate(today);
        request.setDurationDays(14);          // must be overridden by the furthest exam (30 days)
        request.setUseDeadlines(true);
        request.setAvailableHoursPerDay(3);   // 180 min in the 4h evening window => 2 sessions/day
        request.setStyle("balanced");
        request.setSubjectIds(List.of(mathId, physId));

        timetableService.generateAiTimetable(studentId, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TimetableSlot>> captor = ArgumentCaptor.forClass(List.class);
        verify(timetableSlotRepository).saveAll(captor.capture());
        List<TimetableSlot> slots = captor.getValue();

        // The plan spans to the LATEST exam (30 days) — the nearer 10-day exam does not truncate it.
        assertSpansExactly(slots, 30);

        // Revision-before-each-exam: the eve of Math's interior exam (today+9) is Math revision.
        List<TimetableSlot> mathEveSlots = slots.stream()
                .filter(s -> "Math".equals(s.getSubject().getSubjectName()))
                .filter(s -> today.plusDays(9).equals(s.getSlotDate()))
                .collect(Collectors.toList());
        assertFalse(mathEveSlots.isEmpty(), "Math must have a session on the eve of its exam");
        assertTrue(mathEveSlots.stream().allMatch(s -> s.getTopic() != null && s.getTopic().startsWith("Revision:")),
                "The day before Math's exam must be dedicated to Math revision");

        // Both exams are covered: Physics (the horizon exam) still gets its final-day revision.
        LocalDate finalDay = today.plusDays(29);
        assertTrue(slots.stream()
                        .filter(s -> finalDay.equals(s.getSlotDate()))
                        .anyMatch(s -> s.getTopic() != null && s.getTopic().startsWith("Final revision:")),
                "The final day before the last exam must be revision");
    }
}

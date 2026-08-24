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
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * End-to-end (mocked-repository) verification of the rebuilt timetable generation logic against a
 * realistic product scenario:
 *
 * <ul>
 *   <li>Student has a saved study-time preference (MORNING) — the plan must use that window, not a
 *       hard-coded time such as 18:00.</li>
 *   <li>One weak + exam-urgent subject (Data Structures, 40%, exam in 5 days) and one strong subject
 *       (History, 85%, no exam) — the weak/urgent one must receive more sessions.</li>
 *   <li>Each subject has uploaded material with real, ordered extracted topics — slots must use those
 *       topics, in document order, progressing (not repeating the same topic every slot).</li>
 *   <li>An exam 5 days out with a deadline-based plan — the plan must span exactly the remaining days
 *       and end with revision.</li>
 *   <li>Available hours + window must both be honoured (sessions fit inside the window and the daily
 *       hour budget).</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
public class TimetableServiceScenarioTest {

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

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        timetableService = new TimetableService(
                timetableRepository, timetableSlotRepository, subjectRepository, marksRepository,
                examRepository, studentRepository, materialRepository, groqService, objectMapper);
    }

    @Test
    void realScenario_usesSettingsForTime_materialsForTopics_prioritisesWeakUrgentSubject() throws Exception {
        LocalDate today = LocalDate.now();
        UUID studentId = UUID.randomUUID();
        UUID dsId = UUID.randomUUID();       // weak + exam-urgent
        UUID histId = UUID.randomUUID();     // strong, no exam

        // Student's SAVED preference drives the time-of-day — MORNING = 06:00-12:00.
        Student student = Student.builder()
                .id(studentId)
                .fullName("Scenario Student")
                .preferredStudyTime("MORNING")
                .build();

        Subject ds = Subject.builder().id(dsId).student(student)
                .subjectName("Data Structures").difficultyLevel(4).build();
        Subject hist = Subject.builder().id(histId).student(student)
                .subjectName("History").difficultyLevel(2).build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(subjectRepository.findAllByStudentId(eq(studentId), any(PageRequest.class)))
                .thenReturn(List.of(ds, hist));

        // Performance: Data Structures weak (40%), History strong (85%).
        when(marksRepository.findAveragePercentageBySubject(studentId)).thenReturn(List.<Object[]>of(
                new Object[]{dsId, 40.0},
                new Object[]{histId, 85.0}));

        // Deadline-based plan: exam for Data Structures in 5 days (urgent).
        Exam dsExam = Exam.builder().id(UUID.randomUUID()).student(student).subject(ds)
                .examName("DS Midterm").examDate(today.plusDays(5)).build();
        when(examRepository.findAllByStudentIdOrderByExamDateAsc(eq(studentId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dsExam)));

        // Materials → ordered extracted topics per subject.
        List<Map<String, Object>> dsTopics = List.of(
                Map.of("name", "Arrays & Linked Lists", "chapter", "Chapter 1"),
                Map.of("name", "Stacks & Queues", "chapter", "Chapter 2"),
                Map.of("name", "Trees & Graphs", "chapter", "Chapter 3"));
        List<Map<String, Object>> histTopics = List.of(
                Map.of("name", "World War I", "chapter", "Unit 1"),
                Map.of("name", "World War II", "chapter", "Unit 2"));

        when(materialRepository.findAllByStudentIdAndSubjectId(studentId, dsId)).thenReturn(List.of(
                Material.builder().id(UUID.randomUUID()).student(student).subject(ds)
                        .title("DS Notes").extractedTopics(objectMapper.writeValueAsString(dsTopics)).build()));
        when(materialRepository.findAllByStudentIdAndSubjectId(studentId, histId)).thenReturn(List.of(
                Material.builder().id(UUID.randomUUID()).student(student).subject(hist)
                        .title("History Notes").extractedTopics(objectMapper.writeValueAsString(histTopics)).build()));

        Timetable savedTimetable = Timetable.builder()
                .id(UUID.randomUUID()).student(student).weekStartDate(today)
                .title("Study Plan").isAiGenerated(true).isActive(true)
                .createdAt(OffsetDateTime.now()).build();
        when(timetableRepository.save(any(Timetable.class))).thenReturn(savedTimetable);
        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId)).thenReturn(Optional.of(savedTimetable));

        GenerateTimetableRequest request = new GenerateTimetableRequest();
        request.setStartDate(today);
        request.setDurationDays(5);
        request.setUseDeadlines(true);
        request.setTargetDeadlineDate(today.plusDays(5)); // 5 remaining days
        request.setAvailableHoursPerDay(3);                // 180 min/day
        request.setStyle("balanced");                       // 60-min sessions
        request.setSubjectIds(List.of(dsId, histId));

        timetableService.generateAiTimetable(studentId, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TimetableSlot>> captor = ArgumentCaptor.forClass(List.class);
        verify(timetableSlotRepository).saveAll(captor.capture());
        List<TimetableSlot> slots = captor.getValue();

        assertFalse(slots.isEmpty(), "Slots must be generated");

        // ---- Requirement 6/1: TIME comes from settings, never a hard-coded 18:00 ----
        assertTrue(slots.stream().noneMatch(s -> LocalTime.of(18, 0).equals(s.getStartTime())),
                "No slot may start at the old hard-coded 18:00");
        assertTrue(slots.stream().allMatch(s ->
                        !s.getStartTime().isBefore(LocalTime.of(6, 0)) && s.getStartTime().isBefore(LocalTime.of(12, 0))),
                "Every slot must start inside the MORNING window (06:00-12:00) from the student's settings");

        // ---- Requirement 5: sessions honour the requested style length and the daily hour budget ----
        assertTrue(slots.stream().allMatch(s ->
                        java.time.Duration.between(s.getStartTime(), s.getEndTime()).toMinutes() == 60),
                "Balanced style => 60-minute sessions");

        // ---- Requirement 3/8: deadline window respected — exactly 5 consecutive days ----
        assertTrue(slots.stream().allMatch(s -> s.getSlotDate() != null), "Every slot must carry a concrete date");
        List<LocalDate> distinctDates = slots.stream().map(TimetableSlot::getSlotDate)
                .distinct().sorted().collect(Collectors.toList());
        assertEquals(5, distinctDates.size(), "Plan should span the 5 remaining days to the exam");
        assertEquals(today, distinctDates.get(0));
        assertEquals(today.plusDays(4), distinctDates.get(distinctDates.size() - 1));
        // dayOfWeek stored Monday=0..Sunday=6, consistent with the concrete date.
        assertTrue(slots.stream().allMatch(s ->
                s.getDayOfWeek() == (s.getSlotDate().getDayOfWeek().getValue() + 6) % 7),
                "dayOfWeek must be Monday=0..Sunday=6 and match slotDate");
        // Daily budget honoured: 180 min / (60+10) => 2 sessions per day.
        for (LocalDate d : distinctDates) {
            long perDay = slots.stream().filter(s -> d.equals(s.getSlotDate())).count();
            assertEquals(2, perDay, "2 sessions/day fit in 3h within the morning window");
        }

        // ---- Requirement 4: weak + exam-urgent subject gets more sessions ----
        long dsCount = slots.stream().filter(s -> "Data Structures".equals(s.getSubject().getSubjectName())).count();
        long histCount = slots.stream().filter(s -> "History".equals(s.getSubject().getSubjectName())).count();
        assertTrue(dsCount > histCount,
                "Weak + urgent subject (DS) must get more sessions than the strong one (History); got DS=" + dsCount + " History=" + histCount);

        // ---- Requirement 2/7: topics come from materials, in document order, progressing (no generic, no immediate repeat) ----
        assertTrue(slots.stream().allMatch(s -> s.getTopic() != null && !s.getTopic().isBlank()),
                "No blank topics");
        assertTrue(slots.stream().noneMatch(s -> s.getTopic().startsWith("Study:") || s.getTopic().equals("Study")),
                "No generic 'Study' placeholder topics when real material exists");

        // Data Structures: first-pass (non-revision) topics must be the extracted topics IN ORDER.
        List<String> dsPrimary = slots.stream()
                .filter(s -> "Data Structures".equals(s.getSubject().getSubjectName()))
                .sorted(Comparator.comparing(TimetableSlot::getSlotDate).thenComparing(TimetableSlot::getStartTime))
                .map(TimetableSlot::getTopic)
                .filter(t -> !t.startsWith("Revision:") && !t.startsWith("Final revision:"))
                .collect(Collectors.toList());
        assertEquals(List.of(
                "Chapter 1 - Arrays & Linked Lists",
                "Chapter 2 - Stacks & Queues",
                "Chapter 3 - Trees & Graphs"), dsPrimary,
                "DS material topics must appear once each, in document order (progression, not repetition)");

        // History topics also from material, in order.
        List<String> histPrimary = slots.stream()
                .filter(s -> "History".equals(s.getSubject().getSubjectName()))
                .sorted(Comparator.comparing(TimetableSlot::getSlotDate).thenComparing(TimetableSlot::getStartTime))
                .map(TimetableSlot::getTopic)
                .filter(t -> !t.startsWith("Revision:") && !t.startsWith("Final revision:"))
                .collect(Collectors.toList());
        assertEquals(List.of("Unit 1 - World War I", "Unit 2 - World War II"), histPrimary,
                "History topics must come from material in order");

        // ---- Requirement 5/8: the final day before the exam is revision ----
        LocalDate finalDay = distinctDates.get(distinctDates.size() - 1);
        List<TimetableSlot> finalDaySlots = slots.stream()
                .filter(s -> finalDay.equals(s.getSlotDate())).collect(Collectors.toList());
        assertFalse(finalDaySlots.isEmpty());
        assertTrue(finalDaySlots.stream().allMatch(s -> s.getTopic().startsWith("Final revision:")),
                "Final day should be dedicated to revision before the exam");

        // Sanity: at least one spaced 'Revision:' slot exists once material is covered.
        assertTrue(slots.stream().anyMatch(s -> s.getTopic().startsWith("Revision:")),
                "After covering the material, remaining sessions should become spaced revision");
    }
}

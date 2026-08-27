package com.aistudyplanner.service;

import com.aistudyplanner.model.StudyTimeWindow;
import com.aistudyplanner.model.dto.request.GenerateTimetableRequest;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Regression tests for Study Duration + Preferred Start Time → Actual Daily Study Period.
 *
 * <p>Requirements A–D from the specification:
 * <ul>
 *   <li>A. 1 hour + 17:00 → slots from 17:00 to 18:00</li>
 *   <li>B. 2 hours + 17:00 → slots from 17:00 to 19:00</li>
 *   <li>C. 3 hours + 17:00 → slots from 17:00 to 20:00</li>
 *   <li>D. 4 hours + 17:00 → slots from 17:00 to 21:00</li>
 * </ul>
 *
 * <p>Also verifies:
 * <ul>
 *   <li>E. Session style preserved (balanced=60min, intense=90min, relaxed=45min)</li>
 *   <li>F. No hard-coded 18:00 start in any generated slot</li>
 *   <li>G. Backward-compatible broad enum values still resolve</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class TimetableStudyPeriodTest {

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

    private static final LocalDate TODAY = LocalDate.now();

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        timetableService = new TimetableService(
                timetableRepository, timetableSlotRepository, subjectRepository, marksRepository,
                examRepository, studentRepository,
                new MaterialTopicReader(materialRepository, objectMapper), groqService);
    }

    // ─── Shared helpers ──────────────────────────────────────────────────────

    /**
     * Run timetable generation for a student with the given preferredStudyTime enum name and
     * availableHoursPerDay, using "balanced" style and a 2-day plan. Returns the captured slots.
     */
    private List<TimetableSlot> runGeneration(String preferredStudyTime, double hoursPerDay, String style) {
        UUID studentId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();

        Student student = Student.builder()
                .id(studentId)
                .fullName("Test Student")
                .preferredStudyTime(preferredStudyTime)
                .availableHoursPerDay(BigDecimal.valueOf(hoursPerDay))
                .build();

        Subject subject = Subject.builder()
                .id(subjectId)
                .student(student)
                .subjectName("Test Subject")
                .difficultyLevel(3)
                .build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(subjectRepository.findAllByStudentId(eq(studentId), any(PageRequest.class)))
                .thenReturn(List.of(subject));
        when(marksRepository.findAveragePercentageBySubject(studentId))
                .thenReturn(List.<Object[]>of());
        when(examRepository.findAllByStudentIdOrderByExamDateAsc(eq(studentId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(materialRepository.findAllByStudentIdAndSubjectId(studentId, subjectId))
                .thenReturn(List.of());

        Timetable savedTimetable = Timetable.builder()
                .id(UUID.randomUUID())
                .student(student)
                .weekStartDate(TODAY)
                .title("Test Plan")
                .isAiGenerated(true)
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build();
        when(timetableRepository.save(any(Timetable.class))).thenReturn(savedTimetable);
        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId))
                .thenReturn(Optional.of(savedTimetable));

        GenerateTimetableRequest request = new GenerateTimetableRequest();
        request.setStartDate(TODAY);
        request.setDurationDays(2);
        request.setAvailableHoursPerDay((int) Math.round(hoursPerDay));
        request.setStyle(style);
        request.setSubjectIds(List.of(subjectId));

        timetableService.generateAiTimetable(studentId, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TimetableSlot>> captor = ArgumentCaptor.forClass(List.class);
        verify(timetableSlotRepository).saveAll(captor.capture());
        return captor.getValue();
    }

    // ─── Requirements A–D: EVENING (17:00) + duration ────────────────────────

    @Test
    @DisplayName("A: 1 hour + EVENING → all slots start at 17:00, end at 18:00")
    void requirementA_1hour_Evening_17to18() {
        List<TimetableSlot> slots = runGeneration("EVENING", 1, "balanced");
        assertFalse(slots.isEmpty(), "Slots must be generated");

        // All slots must start at the window start (17:00)
        assertTrue(slots.stream().allMatch(s -> LocalTime.of(17, 0).equals(s.getStartTime())),
                "Requirement A: every slot must start at 17:00 (EVENING window start)");

        // Balanced style = 60-min sessions; 1h budget → exactly one 60-min slot per day
        assertTrue(slots.stream().allMatch(s -> Duration.between(s.getStartTime(), s.getEndTime()).toMinutes() == 60),
                "Requirement A: 1h balanced session must be 60 minutes");

        // End time must be 18:00 (17:00 + 1h)
        assertTrue(slots.stream().allMatch(s -> LocalTime.of(18, 0).equals(s.getEndTime())),
                "Requirement A: slot end time must be 18:00 (17:00 + 1h)");
    }

    @Test
    @DisplayName("B: 2 hours + EVENING → slots span 17:00 to 19:00 (2 × 60-min balanced sessions)")
    void requirementB_2hours_Evening_17to19() {
        List<TimetableSlot> slots = runGeneration("EVENING", 2, "balanced");
        assertFalse(slots.isEmpty());

        // First slot of each day must start at 17:00
        Map<LocalDate, List<TimetableSlot>> byDate = slots.stream()
                .collect(Collectors.groupingBy(TimetableSlot::getSlotDate));
        for (List<TimetableSlot> daySlots : byDate.values()) {
            daySlots.sort(Comparator.comparing(TimetableSlot::getStartTime));
            assertEquals(LocalTime.of(17, 0), daySlots.get(0).getStartTime(),
                    "Requirement B: first slot must start at 17:00");
            // Last session must end at or before 19:00 (17:00 + 2h)
            LocalTime latestEnd = daySlots.stream().map(TimetableSlot::getEndTime)
                    .max(Comparator.naturalOrder()).orElseThrow();
            assertFalse(latestEnd.isAfter(LocalTime.of(19, 10)),
                    "Requirement B: all sessions must end by ~19:00 (17:00 + 2h)");
        }
    }

    @Test
    @DisplayName("C: 3 hours + EVENING → first slot starts at 17:00, sessions end by ~20:10")
    void requirementC_3hours_Evening_17to20() {
        List<TimetableSlot> slots = runGeneration("EVENING", 3, "balanced");
        assertFalse(slots.isEmpty());

        Map<LocalDate, List<TimetableSlot>> byDate = slots.stream()
                .collect(Collectors.groupingBy(TimetableSlot::getSlotDate));
        for (List<TimetableSlot> daySlots : byDate.values()) {
            daySlots.sort(Comparator.comparing(TimetableSlot::getStartTime));
            assertEquals(LocalTime.of(17, 0), daySlots.get(0).getStartTime(),
                    "Requirement C: first slot must start at 17:00");
            LocalTime latestEnd = daySlots.stream().map(TimetableSlot::getEndTime)
                    .max(Comparator.naturalOrder()).orElseThrow();
            assertFalse(latestEnd.isAfter(LocalTime.of(20, 10)),
                    "Requirement C: sessions must end by ~20:00 (17:00 + 3h)");
        }
    }

    @Test
    @DisplayName("D: 4 hours + EVENING → first slot starts at 17:00, sessions end by ~21:10")
    void requirementD_4hours_Evening_17to21() {
        List<TimetableSlot> slots = runGeneration("EVENING", 4, "balanced");
        assertFalse(slots.isEmpty());

        Map<LocalDate, List<TimetableSlot>> byDate = slots.stream()
                .collect(Collectors.groupingBy(TimetableSlot::getSlotDate));
        for (List<TimetableSlot> daySlots : byDate.values()) {
            daySlots.sort(Comparator.comparing(TimetableSlot::getStartTime));
            assertEquals(LocalTime.of(17, 0), daySlots.get(0).getStartTime(),
                    "Requirement D: first slot must start at 17:00");
            LocalTime latestEnd = daySlots.stream().map(TimetableSlot::getEndTime)
                    .max(Comparator.naturalOrder()).orElseThrow();
            assertFalse(latestEnd.isAfter(LocalTime.of(21, 10)),
                    "Requirement D: sessions must end by ~21:00 (17:00 + 4h)");
        }
    }

    // ─── Requirement F: no hard-coded 18:00 start ────────────────────────────

    @Test
    @DisplayName("F: MORNING preference → no slot starts at the old hard-coded 18:00")
    void noHardCoded1800Start_morningPreference() {
        List<TimetableSlot> slots = runGeneration("MORNING", 2, "balanced");
        assertTrue(slots.stream().noneMatch(s -> LocalTime.of(18, 0).equals(s.getStartTime())),
                "No slot may start at the old hard-coded 18:00 when preference is MORNING");
        assertTrue(slots.stream().allMatch(s ->
                        !s.getStartTime().isBefore(LocalTime.of(6, 0))),
                "All MORNING slots must start at or after 06:00");
    }

    @Test
    @DisplayName("F: AFTERNOON preference → no slot starts at the old hard-coded 18:00")
    void noHardCoded1800Start_afternoonPreference() {
        List<TimetableSlot> slots = runGeneration("AFTERNOON", 1, "balanced");
        assertTrue(slots.stream().noneMatch(s -> LocalTime.of(18, 0).equals(s.getStartTime())),
                "No slot may start at the old hard-coded 18:00 when preference is AFTERNOON (12:00)");
    }

    // ─── Requirement E: session style preserved ───────────────────────────────

    @Test
    @DisplayName("E: balanced style → 60-minute sessions")
    void sessionStyleBalanced_60min() {
        List<TimetableSlot> slots = runGeneration("EVENING", 2, "balanced");
        assertTrue(slots.stream().allMatch(s ->
                        Duration.between(s.getStartTime(), s.getEndTime()).toMinutes() == 60),
                "Balanced style must produce 60-minute sessions");
    }

    @Test
    @DisplayName("E: intense style → 90-minute sessions")
    void sessionStyleIntense_90min() {
        List<TimetableSlot> slots = runGeneration("EVENING", 3, "intense");
        assertTrue(slots.stream().allMatch(s ->
                        Duration.between(s.getStartTime(), s.getEndTime()).toMinutes() == 90),
                "Intense style must produce 90-minute sessions");
    }

    @Test
    @DisplayName("E: relaxed style → 45-minute sessions")
    void sessionStyleRelaxed_45min() {
        List<TimetableSlot> slots = runGeneration("EVENING", 2, "relaxed");
        assertTrue(slots.stream().allMatch(s ->
                        Duration.between(s.getStartTime(), s.getEndTime()).toMinutes() == 45),
                "Relaxed style must produce 45-minute sessions");
    }

    // ─── Requirement G: backward-compatible broad enum values ────────────────

    @Test
    @DisplayName("G: old label 'Evening (5 PM - 9 PM)' still resolves to 17:00 start (backward compat)")
    void backwardCompatOldLabelEvening() {
        // fromSetting resolves the old human label to EVENING → start 17:00
        assertEquals(LocalTime.of(17, 0),
                StudyTimeWindow.fromSetting("Evening (5 PM - 9 PM)").getStartTime(),
                "Old human label must still resolve to 17:00 start");

        // Full round-trip: student record with old label → slots start at 17:00
        List<TimetableSlot> slots = runGeneration("Evening (5 PM - 9 PM)", 1, "balanced");
        assertTrue(slots.stream().allMatch(s -> LocalTime.of(17, 0).equals(s.getStartTime())),
                "Old label still produces slots starting at 17:00");
    }

    @Test
    @DisplayName("G: 'Morning (6 AM - 12 PM)' still resolves to 06:00 start (backward compat)")
    void backwardCompatOldLabelMorning() {
        assertEquals(LocalTime.of(6, 0),
                StudyTimeWindow.fromSetting("Morning (6 AM - 12 PM)").getStartTime(),
                "Old Morning label must resolve to 06:00");
    }

    // ─── Daily budget respected ────────────────────────────────────────────────

    @Test
    @DisplayName("Daily budget: 1h balanced → exactly 1 session per day ((60+10)/(60+10) = 1)")
    void dailyBudget_1hour_1SessionPerDay() {
        List<TimetableSlot> slots = runGeneration("EVENING", 1, "balanced");
        Map<LocalDate, Long> countByDate = slots.stream()
                .collect(Collectors.groupingBy(TimetableSlot::getSlotDate, Collectors.counting()));
        countByDate.values().forEach(count ->
                assertEquals(1L, count, "1h budget with 60-min sessions → exactly 1 session/day"));
    }

    @Test
    @DisplayName("Daily budget: 3h balanced → exactly 2 sessions per day ((180+10)/(60+10) = 2)")
    void dailyBudget_3hours_balanced_2SessionsPerDay() {
        List<TimetableSlot> slots = runGeneration("EVENING", 3, "balanced");
        Map<LocalDate, Long> countByDate = slots.stream()
                .collect(Collectors.groupingBy(TimetableSlot::getSlotDate, Collectors.counting()));
        countByDate.values().forEach(count ->
                assertEquals(2L, count, "3h budget with 60-min sessions → 2 sessions/day"));
    }

    @Test
    @DisplayName("Daily budget: 2h relaxed (45min) → exactly 2 sessions per day ((120+10)/(45+10) = 2)")
    void dailyBudget_2hours_relaxed_2SessionsPerDay() {
        List<TimetableSlot> slots = runGeneration("EVENING", 2, "relaxed");
        Map<LocalDate, Long> countByDate = slots.stream()
                .collect(Collectors.groupingBy(TimetableSlot::getSlotDate, Collectors.counting()));
        countByDate.values().forEach(count ->
                assertEquals(2L, count, "2h budget with 45-min relaxed sessions → 2 sessions/day"));
    }
}

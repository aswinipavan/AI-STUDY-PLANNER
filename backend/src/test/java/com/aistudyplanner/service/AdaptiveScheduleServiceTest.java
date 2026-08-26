package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.response.AdaptationResponse;
import com.aistudyplanner.model.dto.response.SubjectReadinessResponse;
import com.aistudyplanner.model.entity.Exam;
import com.aistudyplanner.model.entity.Material;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.model.entity.Timetable;
import com.aistudyplanner.model.entity.TimetableSlot;
import com.aistudyplanner.repository.ExamRepository;
import com.aistudyplanner.repository.MarksRepository;
import com.aistudyplanner.repository.MaterialRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import com.aistudyplanner.repository.TimetableRepository;
import com.aistudyplanner.repository.TimetableSlotRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Behavioural tests for adaptive re-planning. Each test asserts one of the product guarantees:
 *
 * <ul>
 *   <li>Topics already covered by a completed session are never scheduled again as new work.</li>
 *   <li>Missed sessions are caught up first rather than silently dropped.</li>
 *   <li>The student's saved study window and daily hours are authoritative — no hard-coded times.</li>
 *   <li>The day before an exam is revision, and urgent/weak subjects get more sessions.</li>
 *   <li>Once the material runs out, sessions become revision / practice / weak-area reinforcement.</li>
 *   <li>Sessions the student already completed are preserved, and new work is placed after them.</li>
 *   <li>Recommended study time is derived from the student's own available hours.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class AdaptiveScheduleServiceTest {

    @Mock private TimetableRepository timetableRepository;
    @Mock private TimetableSlotRepository timetableSlotRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private MarksRepository marksRepository;
    @Mock private ExamRepository examRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private MaterialRepository materialRepository;
    @Mock private TimetableService timetableService;

    private ObjectMapper objectMapper;
    private AdaptiveScheduleService service;

    private LocalDate today;
    private UUID studentId;
    private Timetable timetable;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new AdaptiveScheduleService(
                timetableRepository, timetableSlotRepository, subjectRepository, marksRepository,
                examRepository, studentRepository,
                new MaterialTopicReader(materialRepository, objectMapper), timetableService);

        today = LocalDate.now();
        studentId = UUID.randomUUID();
    }

    // ---------------------------------------------------------------------------------------------
    // Guarantee 1 + 2: covered topics are not re-taught; missed topics are caught up first
    // ---------------------------------------------------------------------------------------------

    @Test
    void adapt_catchesUpMissedTopicsFirst_andNeverReschedulesCoveredOnes() throws Exception {
        Student student = student("MORNING", "3.0");
        Subject ds = subject(student, "Data Structures", 3);

        List<String> topics = materialTopics(student, ds,
                Map.of("chapter", "Chapter 1", "name", "Arrays"),
                Map.of("chapter", "Chapter 2", "name", "Stacks"),
                Map.of("chapter", "Chapter 3", "name", "Trees"),
                Map.of("chapter", "Chapter 4", "name", "Sorting"),
                Map.of("chapter", "Chapter 5", "name", "Graphs"));

        TimetableSlot done = slot(ds, today.minusDays(3), LocalTime.of(6, 0), topics.get(0), true);
        TimetableSlot missed = slot(ds, today.minusDays(2), LocalTime.of(6, 0), topics.get(1), false);
        TimetableSlot open1 = slot(ds, today.plusDays(1), LocalTime.of(6, 0), topics.get(2), false);
        TimetableSlot open2 = slot(ds, today.plusDays(2), LocalTime.of(6, 0), topics.get(3), false);

        wire(student, List.of(done, missed, open1, open2), List.of(done), List.of(missed),
                marks(ds, 40.0), List.of());

        AdaptationResponse response = service.adapt(studentId, "SESSION_COMPLETED");

        List<TimetableSlot> created = capturedSlots();
        List<String> chronological = chronologicalTopics(created);

        // The overdue topic leads, then the material continues in document order.
        assertThat(chronological).hasSizeGreaterThanOrEqualTo(4);
        assertThat(chronological.subList(0, 4)).containsExactly(
                "Chapter 2 - Stacks", "Chapter 3 - Trees", "Chapter 4 - Sorting", "Chapter 5 - Graphs");

        // The already-studied topic is never scheduled again as new work.
        assertThat(chronological).doesNotContain("Chapter 1 - Arrays");

        // The rescheduled session records where it came from.
        TimetableSlot caughtUp = created.stream()
                .filter(s -> "Chapter 2 - Stacks".equals(s.getTopic()))
                .findFirst().orElseThrow();
        assertThat(caughtUp.getNotes()).contains("Rescheduled from " + today.minusDays(2));

        assertThat(response.getAdapted()).isTrue();
        assertThat(response.getMissedSessionsRescheduled()).isEqualTo(1);
        assertThat(response.getTrigger()).isEqualTo("SESSION_COMPLETED");

        // Only the still-open future sessions are deleted; history stays untouched.
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TimetableSlot>> deleted = ArgumentCaptor.forClass(List.class);
        verify(timetableSlotRepository).deleteAll(deleted.capture());
        assertThat(deleted.getValue()).containsExactlyInAnyOrder(open1, open2);
        assertThat(response.getSlotsRemoved()).isEqualTo(2);
        assertThat(response.getSlotsPreserved()).isEqualTo(2);

        // Coverage is reported from real material topics, not a constant.
        SubjectReadinessResponse readiness = response.getSubjects().get(0);
        assertThat(readiness.getTotalTopics()).isEqualTo(5);
        assertThat(readiness.getCoveredTopics()).isEqualTo(1);
        assertThat(readiness.getCoveragePercent()).isEqualTo(20.0);
        assertThat(readiness.getMissedSessions()).isEqualTo(1);
        assertThat(readiness.getAllTopicsCovered()).isFalse();

        // The plan explains itself.
        assertThat(response.getChanges()).isNotEmpty();
        assertThat(String.join(" | ", response.getChanges()))
                .contains("missed session")
                .contains("1 of 5 topics extracted from your uploaded material are already covered");
    }

    // ---------------------------------------------------------------------------------------------
    // Guarantee 3: the student's saved window and daily hours are authoritative
    // ---------------------------------------------------------------------------------------------

    @Test
    void adapt_keepsSessionsInsideSavedWindowAndDailyHourBudget() throws Exception {
        Student student = student("AFTERNOON", "2.0");   // 12:00-17:00, 120 min/day => 1 session/day
        Subject chem = subject(student, "Chemistry", 3);
        List<String> topics = materialTopics(student, chem,
                Map.of("chapter", "Unit 1", "name", "Atomic Structure"),
                Map.of("chapter", "Unit 2", "name", "Bonding"),
                Map.of("chapter", "Unit 3", "name", "Thermodynamics"));

        List<TimetableSlot> existing = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            existing.add(slot(chem, today.plusDays(i), LocalTime.of(12, 0), topics.get(i - 1), false));
        }

        wire(student, existing, List.of(), List.of(), marks(chem, 55.0), List.of());

        service.adapt(studentId, null);
        List<TimetableSlot> created = capturedSlots();

        assertThat(created).isNotEmpty();
        // No slot may fall back to the old hard-coded 18:00 evening start.
        assertThat(created).noneMatch(s -> LocalTime.of(18, 0).equals(s.getStartTime()));
        assertThat(created).allSatisfy(s -> {
            assertThat(s.getStartTime()).isAfterOrEqualTo(LocalTime.of(12, 0));
            assertThat(s.getEndTime()).isBeforeOrEqualTo(LocalTime.of(17, 0));
            assertThat(Duration.between(s.getStartTime(), s.getEndTime()).toMinutes()).isEqualTo(60);
        });
        // 2 available hours with 60-minute sessions => exactly one session per scheduled day.
        Map<LocalDate, Long> perDay = created.stream()
                .collect(Collectors.groupingBy(TimetableSlot::getSlotDate, Collectors.counting()));
        assertThat(perDay.values()).allMatch(count -> count == 1L);
        assertThat(created).allMatch(s -> s.getDayOfWeek() == (s.getSlotDate().getDayOfWeek().getValue() + 6) % 7);
    }

    // ---------------------------------------------------------------------------------------------
    // Guarantee 4: exam deadlines drive urgency, and the day before an exam is revision
    // ---------------------------------------------------------------------------------------------

    @Test
    void adapt_makesTheDayBeforeAnExamRevisionAndKeepsNewMaterialBeforeIt() throws Exception {
        Student student = student("MORNING", "4.0");     // 06:00-12:00, 240 min => 3 sessions/day
        Subject physics = subject(student, "Physics", 3);
        List<String> topics = materialTopics(student, physics,
                Map.of("chapter", "Ch 1", "name", "Kinematics"),
                Map.of("chapter", "Ch 2", "name", "Newton's Laws"),
                Map.of("chapter", "Ch 3", "name", "Work & Energy"),
                Map.of("chapter", "Ch 4", "name", "Rotation"));

        List<TimetableSlot> existing = new ArrayList<>();
        for (int i = 1; i <= 4; i++) {
            existing.add(slot(physics, today.plusDays(i), LocalTime.of(6, 0), topics.get(i - 1), false));
        }

        Exam exam = Exam.builder().id(UUID.randomUUID()).student(student).subject(physics)
                .examName("Physics Midterm").examDate(today.plusDays(3)).build();

        wire(student, existing, List.of(), List.of(), marks(physics, 50.0), List.of(exam));

        AdaptationResponse response = service.adapt(studentId, "EXAM_CHANGED");
        List<TimetableSlot> created = capturedSlots();

        List<TimetableSlot> eve = created.stream()
                .filter(s -> today.plusDays(2).equals(s.getSlotDate())).collect(Collectors.toList());
        assertThat(eve).isNotEmpty();
        assertThat(eve).allMatch(s -> s.getTopic().startsWith("Final revision:"));

        // The day before that is still new material — revision is not smeared across the whole plan.
        List<TimetableSlot> earlier = created.stream()
                .filter(s -> today.plusDays(1).equals(s.getSlotDate())).collect(Collectors.toList());
        assertThat(earlier).isNotEmpty();
        assertThat(earlier).anyMatch(s -> !s.getTopic().startsWith("Final revision:"));

        SubjectReadinessResponse readiness = response.getSubjects().get(0);
        assertThat(readiness.getNextExamDate()).isEqualTo(today.plusDays(3));
        assertThat(readiness.getDaysUntilExam()).isEqualTo(3L);
        assertThat(readiness.getReasons()).anySatisfy(r -> assertThat(r).contains("exam in 3 day(s)"));
    }

    @Test
    void adapt_givesTheWeakUrgentSubjectMoreSessionsThanTheStrongOne() throws Exception {
        Student student = student("MORNING", "4.0");
        Subject weak = subject(student, "Algorithms", 4);
        Subject strong = subject(student, "Zoology", 2);

        List<String> weakTopics = materialTopics(student, weak,
                Map.of("chapter", "A", "name", "Greedy"), Map.of("chapter", "B", "name", "Dynamic Programming"));
        List<String> strongTopics = materialTopics(student, strong,
                Map.of("chapter", "A", "name", "Cells"), Map.of("chapter", "B", "name", "Genetics"));

        List<TimetableSlot> existing = new ArrayList<>();
        for (int i = 1; i <= 4; i++) {
            existing.add(slot(weak, today.plusDays(i), LocalTime.of(6, 0), weakTopics.get(i % 2), false));
            existing.add(slot(strong, today.plusDays(i), LocalTime.of(7, 10), strongTopics.get(i % 2), false));
        }

        Exam exam = Exam.builder().id(UUID.randomUUID()).student(student).subject(weak)
                .examName("Algo Test").examDate(today.plusDays(5)).build();

        wire(student, existing, List.of(), List.of(),
                List.<Object[]>of(new Object[]{weak.getId(), 38.0}, new Object[]{strong.getId(), 91.0}),
                List.of(exam));

        service.adapt(studentId, "MARKS_CHANGED");
        List<TimetableSlot> created = capturedSlots();

        long weakCount = created.stream().filter(s -> weak.getId().equals(s.getSubject().getId())).count();
        long strongCount = created.stream().filter(s -> strong.getId().equals(s.getSubject().getId())).count();
        assertThat(weakCount)
                .as("weak (38%%) + exam-urgent subject must get more sessions than the strong one (91%%)")
                .isGreaterThan(strongCount);
        // Both subjects stay in the plan — adapting must not silently drop a subject.
        assertThat(strongCount).isPositive();
    }

    // ---------------------------------------------------------------------------------------------
    // Guarantee 5: material exhausted -> revision / practice / weak-area reinforcement
    // ---------------------------------------------------------------------------------------------

    @Test
    void adapt_switchesToReinforcementWhenAllMaterialIsCovered() throws Exception {
        Student student = student("MORNING", "4.0");     // 3 sessions/day
        Subject stats = subject(student, "Statistics", 3);
        List<String> topics = materialTopics(student, stats,
                Map.of("chapter", "S1", "name", "Probability"),
                Map.of("chapter", "S2", "name", "Distributions"),
                Map.of("chapter", "S3", "name", "Hypothesis Testing"));

        List<TimetableSlot> completed = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            completed.add(slot(stats, today.minusDays(5 - i), LocalTime.of(6, 0), topics.get(i), true));
        }
        List<TimetableSlot> open = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            open.add(slot(stats, today.plusDays(i), LocalTime.of(6, 0), "Statistics session", false));
        }
        List<TimetableSlot> all = new ArrayList<>(completed);
        all.addAll(open);

        // Weak subject (45%) with every topic already covered => weak-area drilling must appear.
        wire(student, all, completed, List.of(), marks(stats, 45.0), List.of());

        AdaptationResponse response = service.adapt(studentId, "NEW_MATERIAL");
        List<String> created = capturedSlots().stream().map(TimetableSlot::getTopic).collect(Collectors.toList());

        assertThat(created).isNotEmpty();
        assertThat(created).allMatch(t ->
                t.startsWith("Revision:") || t.startsWith("Practice:") || t.startsWith("Weak-area drill:")
                        || t.startsWith("Final revision:"));
        assertThat(created).anyMatch(t -> t.startsWith("Revision:"));
        assertThat(created).anyMatch(t -> t.startsWith("Practice:"));
        assertThat(created).anyMatch(t -> t.startsWith("Weak-area drill:"));
        // Reinforcement is built from the real material topics, not a generic placeholder.
        assertThat(created).allMatch(t -> topics.stream().anyMatch(t::endsWith));

        SubjectReadinessResponse readiness = response.getSubjects().get(0);
        assertThat(readiness.getAllTopicsCovered()).isTrue();
        assertThat(readiness.getCoveragePercent()).isEqualTo(100.0);
        assertThat(readiness.getStage()).isEqualTo("WEAK_AREA");
        assertThat(String.join(" | ", response.getChanges())).contains("weak-area reinforcement");
    }

    // ---------------------------------------------------------------------------------------------
    // Guarantee 6: completed sessions survive an adaptation
    // ---------------------------------------------------------------------------------------------

    @Test
    void adapt_preservesCompletedUpcomingSessionsAndSchedulesAroundThem() throws Exception {
        Student student = student("MORNING", "3.0");     // 2 sessions/day
        Subject bio = subject(student, "Biology", 3);
        List<String> topics = materialTopics(student, bio,
                Map.of("chapter", "B1", "name", "Cell Biology"),
                Map.of("chapter", "B2", "name", "Genetics"));

        LocalDate tomorrow = today.plusDays(1);
        TimetableSlot alreadyDone = slot(bio, tomorrow, LocalTime.of(6, 0), topics.get(0), true);
        TimetableSlot stillOpen = slot(bio, tomorrow, LocalTime.of(7, 10), topics.get(1), false);

        wire(student, List.of(alreadyDone, stillOpen), List.of(alreadyDone), List.of(),
                marks(bio, 70.0), List.of());

        AdaptationResponse response = service.adapt(studentId, "SESSION_COMPLETED");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TimetableSlot>> deleted = ArgumentCaptor.forClass(List.class);
        verify(timetableSlotRepository).deleteAll(deleted.capture());
        assertThat(deleted.getValue()).containsExactly(stillOpen);
        assertThat(response.getSlotsPreserved()).isEqualTo(1);

        List<TimetableSlot> tomorrowSlots = capturedSlots().stream()
                .filter(s -> tomorrow.equals(s.getSlotDate())).collect(Collectors.toList());
        assertThat(tomorrowSlots).hasSize(1);           // the completed session used up one of the two
        assertThat(tomorrowSlots.get(0).getStartTime()).isEqualTo(LocalTime.of(7, 10));
        // The completed topic is not repeated as new work.
        assertThat(tomorrowSlots.get(0).getTopic()).isNotEqualTo(topics.get(0));
    }

    // ---------------------------------------------------------------------------------------------
    // Guarantee 7: recommended study time comes from the student's own available hours
    // ---------------------------------------------------------------------------------------------

    @Test
    void readiness_derivesRecommendedStudyTimeFromTheStudentsOwnAvailableHours() throws Exception {
        Student student = student("MORNING", "2.0");     // 120 minutes a day, one subject => all of it
        Subject maths = subject(student, "Mathematics", 3);
        materialTopics(student, maths,
                Map.of("chapter", "M1", "name", "Calculus"),
                Map.of("chapter", "M2", "name", "Algebra"));

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(subjectRepository.findAllByStudentId(studentId)).thenReturn(List.of(maths));
        when(marksRepository.findAveragePercentageBySubject(studentId)).thenReturn(marks(maths, 62.0));
        when(examRepository.findUpcomingExams(eq(studentId), any(LocalDate.class))).thenReturn(List.of());
        when(timetableSlotRepository.findCompletedSlotsForStudent(studentId)).thenReturn(List.of());
        when(timetableSlotRepository.findMissedSlots(eq(studentId), any(LocalDate.class))).thenReturn(List.of());
        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId)).thenReturn(Optional.empty());

        List<SubjectReadinessResponse> readiness = service.getSubjectReadiness(studentId);

        assertThat(readiness).hasSize(1);
        assertThat(readiness.get(0).getRecommendedStudyTime()).isEqualTo("2h");
        assertThat(readiness.get(0).getSessionSharePercent()).isEqualTo(100.0);
        assertThat(readiness.get(0).getStage()).isEqualTo("LEARNING");
        assertThat(readiness.get(0).getReadiness()).isBetween(0.0, 100.0);
        // Read-only: nothing is written.
        verify(timetableSlotRepository, never()).saveAll(any());
        verify(timetableSlotRepository, never()).deleteAll(any());
    }

    @Test
    void formatMinutes_rendersHoursAndMinutesWithoutHardCodedText() {
        assertThat(AdaptiveScheduleService.formatMinutes(45)).isEqualTo("45m");
        assertThat(AdaptiveScheduleService.formatMinutes(120)).isEqualTo("2h");
        assertThat(AdaptiveScheduleService.formatMinutes(135)).isEqualTo("2h 15m");
    }

    // ---------------------------------------------------------------------------------------------
    // Fixtures
    // ---------------------------------------------------------------------------------------------

    private Student student(String window, String hours) {
        return Student.builder()
                .id(studentId)
                .fullName("Adaptive Student")
                .preferredStudyTime(window)
                .availableHoursPerDay(new BigDecimal(hours))
                .studyStreak(4)
                .build();
    }

    private Subject subject(Student student, String name, int difficulty) {
        return Subject.builder().id(UUID.randomUUID()).student(student)
                .subjectName(name).difficultyLevel(difficulty).build();
    }

    /** Stub a subject's uploaded material and return the topic labels the planner will see. */
    @SafeVarargs
    private final List<String> materialTopics(Student student, Subject subject,
                                             Map<String, Object>... topics) throws Exception {
        Material material = Material.builder()
                .id(UUID.randomUUID()).student(student).subject(subject)
                .title(subject.getSubjectName() + " Notes")
                .difficultyScore(60)
                .extractedTopics(objectMapper.writeValueAsString(List.of(topics)))
                .build();
        lenient().when(materialRepository.findAllByStudentIdAndSubjectId(studentId, subject.getId()))
                .thenReturn(List.of(material));
        return List.of(topics).stream()
                .map(t -> t.get("chapter") + " - " + t.get("name"))
                .collect(Collectors.toList());
    }

    private TimetableSlot slot(Subject subject, LocalDate date, LocalTime start, String topic, boolean completed) {
        return TimetableSlot.builder()
                .id(UUID.randomUUID())
                .timetable(timetable)
                .subject(subject)
                .dayOfWeek((date.getDayOfWeek().getValue() + 6) % 7)
                .slotDate(date)
                .startTime(start)
                .endTime(start.plusMinutes(60))
                .topic(topic)
                .isCompleted(completed)
                .build();
    }

    private List<Object[]> marks(Subject subject, double average) {
        return List.<Object[]>of(new Object[]{subject.getId(), average});
    }

    /** Common repository wiring for an {@code adapt()} call. */
    private void wire(Student student, List<TimetableSlot> allSlots, List<TimetableSlot> completed,
                      List<TimetableSlot> missed, List<Object[]> marks, List<Exam> exams) {
        timetable = Timetable.builder()
                .id(UUID.randomUUID()).student(student).weekStartDate(today)
                .title("Study Plan").isAiGenerated(true).isActive(true)
                .createdAt(OffsetDateTime.now()).build();
        allSlots.forEach(s -> s.setTimetable(timetable));

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(timetableRepository.findByStudentIdAndIsActiveTrue(studentId)).thenReturn(Optional.of(timetable));
        when(timetableSlotRepository.findAllByTimetableIdOrderBySlotDate(timetable.getId())).thenReturn(allSlots);
        when(marksRepository.findAveragePercentageBySubject(studentId)).thenReturn(marks);
        when(examRepository.findUpcomingExams(eq(studentId), any(LocalDate.class))).thenReturn(exams);
        when(timetableSlotRepository.findCompletedSlotsForStudent(studentId)).thenReturn(completed);
        when(timetableSlotRepository.findMissedSlots(eq(studentId), any(LocalDate.class))).thenReturn(missed);
    }

    private List<TimetableSlot> capturedSlots() {
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TimetableSlot>> captor = ArgumentCaptor.forClass(List.class);
        verify(timetableSlotRepository).saveAll(captor.capture());
        return captor.getValue();
    }

    private List<String> chronologicalTopics(List<TimetableSlot> slots) {
        return slots.stream()
                .sorted(Comparator.comparing(TimetableSlot::getSlotDate).thenComparing(TimetableSlot::getStartTime))
                .map(TimetableSlot::getTopic)
                .collect(Collectors.toList());
    }
}

package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.response.AcademicReadinessResponse;
import com.aistudyplanner.model.dto.response.AiPerformanceAnalysisResponse;
import com.aistudyplanner.model.dto.response.SubjectReadinessResponse;
import com.aistudyplanner.model.dto.response.SubjectResponse;
import com.aistudyplanner.model.entity.PerformanceSnapshot;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.model.entity.Timetable;
import com.aistudyplanner.model.entity.TimetableSlot;
import com.aistudyplanner.repository.ExamRepository;
import com.aistudyplanner.repository.MarksRepository;
import com.aistudyplanner.repository.PerformanceSnapshotRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import com.aistudyplanner.repository.TimetableSlotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Guards the reporting layer against re-introducing invented numbers.
 *
 * <p>Everything the performance screens show has to be traceable to something the student actually did
 * or configured: their marks, the topics extracted from their uploaded material, the sessions they
 * completed or missed, their exam dates, and their own available-hours / study-window settings. These
 * tests pin each of those paths, including the fallbacks used when a signal genuinely does not exist
 * yet.</p>
 */
@ExtendWith(MockitoExtension.class)
class PerformanceServiceTest {

    @Mock private MarksRepository marksRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private PerformanceSnapshotRepository snapshotRepository;
    @Mock private ExamRepository examRepository;
    @Mock private TimetableSlotRepository timetableSlotRepository;
    @Mock private AdaptiveScheduleService adaptiveScheduleService;
    @Mock private GroqService groqService;

    private PerformanceService performanceService;

    private UUID studentId;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        performanceService = new PerformanceService(
                marksRepository, subjectRepository, studentRepository, snapshotRepository,
                examRepository, timetableSlotRepository, adaptiveScheduleService, groqService);
    }

    // ---------------------------------------------------------------------------------------------
    // Recommended study time
    // ---------------------------------------------------------------------------------------------

    @Test
    void priority_recommendedStudyTimeComesFromAdaptiveSignals_notAFixedLadder() {
        Student student = student("MORNING", 3.0, 5);
        Subject maths = subject("Mathematics", 4);

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(subjectRepository.findAllByStudentId(studentId)).thenReturn(List.of(maths));
        when(marksRepository.findAveragePercentageBySubject(studentId))
                .thenReturn(List.<Object[]>of(new Object[]{maths.getId(), 45.0}));
        when(examRepository.findUpcomingExams(studentId, LocalDate.now())).thenReturn(List.of());
        when(adaptiveScheduleService.getSubjectReadiness(studentId)).thenReturn(List.of(
                SubjectReadinessResponse.builder()
                        .subjectId(maths.getId())
                        .subjectName("Mathematics")
                        .recommendedStudyTime("1h 20m")
                        .totalTopics(6)
                        .coveredTopics(2)
                        .coveragePercent(33.3)
                        .missedSessions(1)
                        .build()));

        List<SubjectResponse> priorities = performanceService.getExplainablePrioritySubjects(studentId);

        assertThat(priorities).hasSize(1);
        SubjectResponse maths1 = priorities.get(0);
        assertThat(maths1.getRecommendedStudyTime())
                .as("must come from the adaptive signal, which is derived from the student's own hours")
                .isEqualTo("1h 20m");
        assertThat(maths1.getRecommendedStudyTime())
                .isNotIn("2h 30m", "1h 45m", "1h 00m");

        // Explanations reference real progress, not the number of uploaded files.
        assertThat(maths1.getReasons())
                .contains("Low recent marks (45.0%)")
                .contains("High subject complexity (Level 4/5)")
                .contains("2 of 6 material topics covered (33%)")
                .contains("1 scheduled session(s) missed");
    }

    @Test
    void priority_withoutAPlanFallsBackToTheStudentsOwnHoursCappedByTheirWindow() {
        Subject bio = subject("Biology", 2);
        // First call: 3h/day in the evening window (240 min) -> the full 3h fits.
        // Second call: 4h/day late at night (21:00-23:59 = 179 min) -> capped to the window.
        when(studentRepository.findById(studentId)).thenReturn(
                Optional.of(student("EVENING", 3.0, 7)),
                Optional.of(student("LATE_NIGHT", 4.0, 7)));
        when(subjectRepository.findAllByStudentId(studentId)).thenReturn(List.of(bio));
        when(marksRepository.findAveragePercentageBySubject(studentId)).thenReturn(List.of());
        when(examRepository.findUpcomingExams(studentId, LocalDate.now())).thenReturn(List.of());
        when(adaptiveScheduleService.getSubjectReadiness(studentId)).thenReturn(List.of());

        assertThat(performanceService.getExplainablePrioritySubjects(studentId).get(0).getRecommendedStudyTime())
                .isEqualTo("3h");
        assertThat(performanceService.getExplainablePrioritySubjects(studentId).get(0).getRecommendedStudyTime())
                .as("a suggestion the student could not fit inside their chosen window would be useless")
                .isEqualTo("2h 59m");
    }

    // ---------------------------------------------------------------------------------------------
    // Academic readiness pillars
    // ---------------------------------------------------------------------------------------------

    @Test
    void readiness_pillarsAreMeasuredFromCoverageAttendanceAndExamPace() {
        Student student = student("MORNING", 3.0, 6);
        Subject maths = subject("Mathematics", 5);
        Subject bio = subject("Biology", 2);

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(subjectRepository.findAllByStudentId(studentId)).thenReturn(List.of(maths, bio));
        when(marksRepository.findAveragePercentageBySubject(studentId)).thenReturn(List.<Object[]>of(
                new Object[]{maths.getId(), 40.0},
                new Object[]{bio.getId(), 80.0}));
        when(examRepository.findUpcomingExams(studentId, LocalDate.now())).thenReturn(List.of());
        when(adaptiveScheduleService.getSubjectReadiness(studentId)).thenReturn(List.of(
                SubjectReadinessResponse.builder()
                        .subjectId(maths.getId()).subjectName("Mathematics")
                        .averagePercentage(40.0)
                        .totalTopics(8).coveredTopics(2).coveragePercent(25.0)
                        .consistencyPercent(50.0)
                        .examPreparedness(30.0)
                        .recommendedStudyTime("1h 30m")
                        .build(),
                SubjectReadinessResponse.builder()
                        .subjectId(bio.getId()).subjectName("Biology")
                        .averagePercentage(80.0)
                        .totalTopics(4).coveredTopics(3).coveragePercent(75.0)
                        .consistencyPercent(100.0)
                        .examPreparedness(null)          // no exam for Biology yet
                        .recommendedStudyTime("45m")
                        .build()));

        AcademicReadinessResponse readiness = performanceService.getAcademicReadiness(studentId);

        assertThat(readiness.getSubjectPerformanceScore()).isEqualTo(60.0);   // (40 + 80) / 2
        assertThat(readiness.getMaterialCoverageScore()).isEqualTo(50.0);     // (25 + 75) / 2 real topics
        assertThat(readiness.getStudyConsistencyScore()).isEqualTo(75.0);     // (50 + 100) / 2 attendance
        assertThat(readiness.getExamPreparationScore())
                .as("mean pace over subjects that actually have an exam — not a 60/72/85 step by urgency")
                .isEqualTo(30.0);
        // 60*0.35 + 30*0.25 + 75*0.20 + 50*0.20 = 53.5 -> 54
        assertThat(readiness.getOverallReadiness()).isEqualTo(54.0);
        assertThat(readiness.getPrimaryFocusSubject()).isEqualTo("Mathematics");
    }

    @Test
    void readiness_beforeAnySubjectExistsReportsZeroCoverageAndTheRealStreak() {
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student("MORNING", 2.0, 4)));
        when(subjectRepository.findAllByStudentId(studentId)).thenReturn(List.of());
        when(adaptiveScheduleService.getSubjectReadiness(studentId)).thenReturn(List.of());

        AcademicReadinessResponse readiness = performanceService.getAcademicReadiness(studentId);

        assertThat(readiness.getMaterialCoverageScore())
                .as("no material means nothing covered — the old floor of 40 flattered an empty account")
                .isEqualTo(0.0);
        assertThat(readiness.getExamPreparationScore())
                .as("no exams: coverage stands in, instead of an unearned 80")
                .isEqualTo(0.0);
        assertThat(readiness.getStudyConsistencyScore()).isEqualTo(57.1);     // 4/7 of a week
        assertThat(readiness.getSubjectPerformanceScore()).isEqualTo(50.0);   // unknown -> neutral
        // 50*0.35 + 0*0.25 + 57.14*0.20 + 0*0.20 = 28.9 -> 29
        assertThat(readiness.getOverallReadiness()).isEqualTo(29.0);
    }

    // ---------------------------------------------------------------------------------------------
    // AI analysis wording
    // ---------------------------------------------------------------------------------------------

    @Test
    void aiAnalysis_doesNotClaimAThirtyDayExamWindowThatIsNeverQueried() {
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student("MORNING", 2.0, 5)));
        when(subjectRepository.findAllByStudentId(studentId)).thenReturn(List.of());
        when(marksRepository.findAveragePercentageBySubject(studentId)).thenReturn(List.of());
        when(examRepository.findUpcomingExams(studentId, LocalDate.now())).thenReturn(List.of());
        when(adaptiveScheduleService.getSubjectReadiness(studentId)).thenReturn(List.of());

        AiPerformanceAnalysisResponse analysis = performanceService.getAiPerformanceAnalysis(studentId);

        assertThat(analysis.getExamUrgency())
                .isEqualTo("No upcoming exams are scheduled.")
                .doesNotContain("30 days");
        assertThat(analysis.getRecommendedStudyDuration())
                .as("derived from availableHoursPerDay, not the old literal \"2 hours/day\"")
                .isEqualTo("2h");
    }

    // ---------------------------------------------------------------------------------------------
    // Weekly snapshot
    // ---------------------------------------------------------------------------------------------

    @Test
    void weeklySnapshot_recordsSessionsActuallyCompletedAndTheHoursTheyTook() {
        LocalDate today = LocalDate.now();
        Student student = student("MORNING", 4.0, 5);

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(marksRepository.findAveragePercentageBySubject(studentId)).thenReturn(List.of());
        when(timetableSlotRepository.findCompletedSlotsForStudent(studentId)).thenReturn(List.of(
                completedSlot(today, LocalTime.of(6, 0), LocalTime.of(7, 0)),            // 60m
                completedSlot(today.minusDays(3), LocalTime.of(6, 0), LocalTime.of(7, 30)), // 90m
                completedSlot(today.minusDays(6), LocalTime.of(6, 0), LocalTime.of(6, 45)), // 45m, boundary
                completedSlot(today.minusDays(10), LocalTime.of(6, 0), LocalTime.of(8, 0)), // outside the week
                completedSlot(null, LocalTime.of(6, 0), LocalTime.of(7, 0))));              // legacy, undated

        performanceService.saveWeeklySnapshot(studentId);

        ArgumentCaptor<PerformanceSnapshot> captor = ArgumentCaptor.forClass(PerformanceSnapshot.class);
        verify(snapshotRepository).save(captor.capture());
        PerformanceSnapshot snapshot = captor.getValue();

        assertThat(snapshot.getTasksCompleted())
                .as("the old snapshot always stored 0 completed tasks")
                .isEqualTo(3);
        assertThat(snapshot.getStudyHoursWeek())
                .as("195 minutes of completed sessions, not streak x configured hours")
                .isEqualByComparingTo(new BigDecimal("3.3"));
        assertThat(snapshot.getSnapshotDate()).isEqualTo(today);
    }

    // ---------------------------------------------------------------------------------------------
    // Fixtures
    // ---------------------------------------------------------------------------------------------

    private Student student(String window, double hours, int streak) {
        return Student.builder()
                .id(studentId)
                .fullName("Reporting Student")
                .preferredStudyTime(window)
                .availableHoursPerDay(BigDecimal.valueOf(hours))
                .studyStreak(streak)
                .build();
    }

    private Subject subject(String name, int difficulty) {
        return Subject.builder()
                .id(UUID.randomUUID())
                .subjectName(name)
                .difficultyLevel(difficulty)
                .build();
    }

    private TimetableSlot completedSlot(LocalDate date, LocalTime start, LocalTime end) {
        return TimetableSlot.builder()
                .id(UUID.randomUUID())
                .timetable(Timetable.builder().id(UUID.randomUUID()).build())
                .slotDate(date)
                .startTime(start)
                .endTime(end)
                .isCompleted(true)
                .build();
    }
}

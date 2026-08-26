package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.StudyTimeWindow;
import com.aistudyplanner.model.dto.response.AdaptationResponse;
import com.aistudyplanner.model.dto.response.SubjectReadinessResponse;
import com.aistudyplanner.model.entity.Exam;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.model.entity.Timetable;
import com.aistudyplanner.model.entity.TimetableSlot;
import com.aistudyplanner.repository.ExamRepository;
import com.aistudyplanner.repository.MarksRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import com.aistudyplanner.repository.TimetableRepository;
import com.aistudyplanner.repository.TimetableSlotRepository;
import com.aistudyplanner.util.Constants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Adaptive study planning: keeps an existing plan in step with what the student has actually done.
 *
 * <p>Where {@link TimetableService} <em>creates</em> a plan, this service <em>evolves</em> one. It
 * never rebuilds history: past days and any session the student already ticked off are preserved
 * verbatim, and only the still-open future is rewritten. Every input is real stored data:</p>
 *
 * <table>
 *   <tr><th>Decision</th><th>Source of truth</th></tr>
 *   <tr><td><b>When</b> to study</td>
 *       <td>the student's saved {@code preferredStudyTime} window and {@code availableHoursPerDay}
 *           — never a hard-coded clock time</td></tr>
 *   <tr><td><b>What</b> to study</td>
 *       <td>topics extracted from uploaded material by the NLP pipeline, consumed in document order
 *           and skipping anything a completed session already covered</td></tr>
 *   <tr><td><b>Priority</b></td>
 *       <td>marks average, subject difficulty, analysed material difficulty, remaining coverage,
 *           attendance on past sessions, and days remaining to each exam</td></tr>
 * </table>
 *
 * <p>Session length and therefore the daily rhythm are inherited from the plan being adapted, so
 * adapting never silently changes the study style the student chose.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdaptiveScheduleService {

    /** Adaptation triggers, mirrored by the {@code trigger} field of {@link AdaptationResponse}. */
    public static final String TRIGGER_MANUAL = "MANUAL";
    public static final String TRIGGER_SESSION_COMPLETED = "SESSION_COMPLETED";
    public static final String TRIGGER_MISSED_SESSIONS = "MISSED_SESSIONS";
    public static final String TRIGGER_NEW_MATERIAL = "NEW_MATERIAL";
    public static final String TRIGGER_EXAM_CHANGED = "EXAM_CHANGED";
    public static final String TRIGGER_MARKS_CHANGED = "MARKS_CHANGED";

    /** Readiness stages a subject can be in. */
    private static final String STAGE_LEARNING = "LEARNING";
    private static final String STAGE_REVISION = "REVISION";
    private static final String STAGE_PRACTICE = "PRACTICE";
    private static final String STAGE_WEAK_AREA = "WEAK_AREA";
    private static final String STAGE_FINAL_PREP = "FINAL_PREP";

    /** Marks average below which a subject is treated as a weak area needing drills. */
    private static final double WEAK_SUBJECT_THRESHOLD = 60.0;

    private final TimetableRepository timetableRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final SubjectRepository subjectRepository;
    private final MarksRepository marksRepository;
    private final ExamRepository examRepository;
    private final StudentRepository studentRepository;
    private final MaterialTopicReader materialTopicReader;
    private final TimetableService timetableService;

    // ---------------------------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------------------------

    /**
     * Read-only adaptive insight: per-subject readiness plus the reasons the plan currently looks the
     * way it does. Safe to call from a GET — it never writes.
     */
    @Transactional(readOnly = true)
    public List<SubjectReadinessResponse> getSubjectReadiness(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        List<Subject> subjects = subjectRepository.findAllByStudentId(studentId);
        if (subjects == null || subjects.isEmpty()) {
            return List.of();
        }
        Signals signals = collectSignals(student, subjects, LocalDate.now());
        return toReadinessResponses(signals);
    }

    /**
     * Re-plan the open future of the student's active timetable against current reality.
     *
     * <p>Preserved untouched: every past day, and every future session already marked complete.
     * Rewritten: the remaining open sessions. Missed (past, incomplete) sessions have their topics
     * pulled to the front of the queue so overdue material is caught up first, and the sessions the
     * student never got to are recorded as rescheduled rather than silently dropped.</p>
     *
     * @param trigger what prompted the adaptation, used only for the explanation text
     */
    @Transactional
    public AdaptationResponse adapt(UUID studentId, String trigger) {
        String resolvedTrigger = (trigger == null || trigger.isBlank()) ? TRIGGER_MANUAL : trigger.trim().toUpperCase();
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Timetable timetable = timetableRepository.findByStudentIdAndIsActiveTrue(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("No active timetable found"));

        LocalDate today = LocalDate.now();
        List<TimetableSlot> allSlots = timetableSlotRepository.findAllByTimetableIdOrderBySlotDate(timetable.getId());

        // --- Partition the plan. History is never rewritten. -------------------------------------
        List<TimetableSlot> pastSlots = new ArrayList<>();
        List<TimetableSlot> futureCompleted = new ArrayList<>();
        List<TimetableSlot> futureOpen = new ArrayList<>();
        for (TimetableSlot slot : allSlots) {
            LocalDate date = slot.getSlotDate();
            if (date == null || date.isBefore(today)) {
                pastSlots.add(slot);                     // legacy rows without a date count as history
            } else if (Boolean.TRUE.equals(slot.getIsCompleted())) {
                futureCompleted.add(slot);
            } else {
                futureOpen.add(slot);
            }
        }
        List<TimetableSlot> missedSlots = pastSlots.stream()
                .filter(s -> !Boolean.TRUE.equals(s.getIsCompleted()))
                .filter(s -> s.getSlotDate() != null)
                .collect(Collectors.toList());

        // Plan scope stays exactly the subjects the plan already covers: adapting must not silently
        // add or drop subjects, that is what regenerating the plan is for.
        List<Subject> planSubjects = distinctSubjects(allSlots);
        if (planSubjects.isEmpty()) {
            return AdaptationResponse.builder()
                    .adapted(false)
                    .trigger(resolvedTrigger)
                    .summary("This plan has no subject sessions to adapt yet.")
                    .changes(List.of("Generate a study plan first, then it will adapt as you study."))
                    .slotsRemoved(0).slotsCreated(0).slotsPreserved(allSlots.size())
                    .missedSessionsRescheduled(0)
                    .subjects(List.of())
                    .timetable(timetableService.getTimetable(studentId))
                    .build();
        }

        Signals signals = collectSignals(student, planSubjects, today);

        // --- Planning horizon: never shrink the plan, never stop before the last exam. -----------
        LocalDate lastPlannedDate = allSlots.stream()
                .map(TimetableSlot::getSlotDate)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(today);
        LocalDate lastExamDate = signals.upcomingExams.stream()
                .map(Exam::getExamDate)
                .max(Comparator.naturalOrder())
                .orElse(null);
        LocalDate horizonEnd = lastPlannedDate.isBefore(today) ? today : lastPlannedDate;
        if (lastExamDate != null && lastExamDate.isAfter(horizonEnd)) {
            horizonEnd = lastExamDate;
        }

        // --- Capacity: the user's own window and hours; session length inherited from the plan. ---
        StudyTimeWindow window = StudyTimeWindow.fromSetting(student.getPreferredStudyTime());
        int sessionMinutes = inferSessionMinutes(allSlots);
        int buffer = Constants.BUFFER_BETWEEN_SLOTS_MINUTES;
        double availableHours = student.getAvailableHoursPerDay() != null
                ? student.getAvailableHoursPerDay().doubleValue()
                : Constants.DEFAULT_AVAILABLE_HOURS_PER_DAY;
        int dailyMinutes = Math.min((int) Math.round(availableHours * 60), window.getWindowMinutes());
        if (dailyMinutes <= 0) {
            dailyMinutes = sessionMinutes;
        }
        int sessionsPerDay = (dailyMinutes + buffer) / (sessionMinutes + buffer);
        int effectiveSessionMinutes = sessionMinutes;
        if (sessionsPerDay < 1) {
            sessionsPerDay = 1;
            effectiveSessionMinutes = Math.max(Constants.MIN_SLOT_DURATION_MINUTES, dailyMinutes);
        }

        // --- Free capacity per day, respecting sessions already completed on that day. ------------
        Map<LocalDate, List<TimetableSlot>> completedByDate = futureCompleted.stream()
                .filter(s -> s.getSlotDate() != null)
                .collect(Collectors.groupingBy(TimetableSlot::getSlotDate));

        List<DaySlotPlan> dayPlans = new ArrayList<>();
        int totalFree = 0;
        for (LocalDate date = today; !date.isAfter(horizonEnd); date = date.plusDays(1)) {
            List<TimetableSlot> done = completedByDate.getOrDefault(date, List.of());
            int free = sessionsPerDay - done.size();
            if (free <= 0) {
                continue;
            }
            LocalTime start = window.getStartTime();
            for (TimetableSlot d : done) {
                if (d.getEndTime() != null) {
                    LocalTime candidate = d.getEndTime().plusMinutes(buffer);
                    if (candidate.isAfter(start)) start = candidate;
                }
            }
            // Today only: do not schedule a session in a slot that has already elapsed.
            if (date.equals(today)) {
                LocalTime nowFloor = roundUpToFiveMinutes(LocalTime.now());
                if (nowFloor.isAfter(start)) start = nowFloor;
            }
            // A whole session must fit inside the student's chosen window; a partial session would
            // silently push study time outside the hours they asked for.
            if (minutesUntilWindowEnd(start, window) < effectiveSessionMinutes) {
                continue;
            }
            dayPlans.add(new DaySlotPlan(date, start, free));
            totalFree += free;
        }

        if (totalFree == 0) {
            List<String> changes = new ArrayList<>();
            changes.add("Your remaining days are already fully booked inside your "
                    + describeWindow(window) + " study window, so nothing was moved.");
            if (!missedSlots.isEmpty()) {
                changes.add(missedSlots.size() + " missed session(s) could not be rescheduled — extend the plan "
                        + "or raise your daily study hours to make room.");
            }
            return AdaptationResponse.builder()
                    .adapted(false)
                    .trigger(resolvedTrigger)
                    .summary("No free capacity left in the current plan.")
                    .changes(changes)
                    .slotsRemoved(0).slotsCreated(0)
                    .slotsPreserved(pastSlots.size() + futureCompleted.size())
                    .missedSessionsRescheduled(0)
                    .horizonStart(today).horizonEnd(horizonEnd)
                    .subjects(toReadinessResponses(signals))
                    .timetable(timetableService.getTimetable(studentId))
                    .build();
        }

        // --- Topic supply per subject: overdue first, then uncovered material, then reinforcement. -
        Map<UUID, List<PlannedTopic>> supply = new LinkedHashMap<>();
        Map<UUID, Integer> rescheduledPerSubject = new HashMap<>();
        for (Subject subject : planSubjects) {
            SubjectSignal sig = signals.bySubject.get(subject.getId());
            List<PlannedTopic> queue = new ArrayList<>();
            Set<String> queued = new HashSet<>();

            // 1. Overdue topics from missed sessions — caught up before anything new.
            for (TimetableSlot missed : missedSlots) {
                if (missed.getSubject() == null || !missed.getSubject().getId().equals(subject.getId())) continue;
                String topic = missed.getTopic();
                if (topic == null || topic.isBlank()) continue;
                String key = MaterialTopicReader.canonicalTopicKey(topic);
                if (key.isEmpty() || signals.coveredTopicKeys.contains(key) || !queued.add(key)) continue;
                queue.add(new PlannedTopic(topic, missed.getSlotDate()));
                rescheduledPerSubject.merge(subject.getId(), 1, Integer::sum);
            }

            // 2. Extracted material topics not yet covered, in document order.
            for (String topic : sig.orderedTopics) {
                String key = MaterialTopicReader.canonicalTopicKey(topic);
                if (key.isEmpty() || signals.coveredTopicKeys.contains(key) || !queued.add(key)) continue;
                queue.add(new PlannedTopic(topic, null));
            }
            supply.put(subject.getId(), queue);
        }

        // --- Weighted ordering of which subject each free session belongs to. --------------------
        Map<UUID, Double> weights = new HashMap<>();
        for (Subject subject : planSubjects) {
            weights.put(subject.getId(), signals.bySubject.get(subject.getId()).priorityWeight);
        }
        List<Subject> sessionOrder = buildWeightedSessionOrder(planSubjects, weights, totalFree);
        Map<UUID, LocalDate> examEve = buildExamEveMap(signals.upcomingExams, today, horizonEnd);

        // --- Emit the new future slots. ----------------------------------------------------------
        Map<UUID, Integer> supplyCursor = new HashMap<>();
        Map<UUID, Integer> reinforcementCursor = new HashMap<>();
        List<TimetableSlot> created = new ArrayList<>();
        int cursor = 0;
        for (DaySlotPlan day : dayPlans) {
            LocalTime time = day.startTime;
            for (int i = 0; i < day.freeSessions && cursor < sessionOrder.size(); i++, cursor++) {
                if (minutesUntilWindowEnd(time, window) < effectiveSessionMinutes) {
                    break;                              // stay inside the student's chosen window
                }
                Subject subject = sessionOrder.get(cursor);
                SubjectSignal sig = signals.bySubject.get(subject.getId());
                // The day before this subject's exam is always explicit revision — never new material
                // the student has no time left to consolidate.
                boolean isExamEve = day.date.equals(examEve.get(subject.getId()));

                TopicAssignment assignment = nextAssignment(
                        subject, sig, supply.get(subject.getId()), supplyCursor, reinforcementCursor,
                        isExamEve);

                TimetableSlot slot = TimetableSlot.builder()
                        .timetable(timetable)
                        .subject(subject)
                        .dayOfWeek((day.date.getDayOfWeek().getValue() + 6) % 7)
                        .slotDate(day.date)
                        .startTime(time)
                        .endTime(time.plusMinutes(effectiveSessionMinutes))
                        .topic(MaterialTopicReader.truncate(assignment.label))
                        .isCompleted(false)
                        .notes(assignment.note)
                        .build();
                created.add(slot);
                time = time.plusMinutes(effectiveSessionMinutes + buffer);
            }
        }

        int removed = futureOpen.size();
        if (!futureOpen.isEmpty()) {
            timetableSlotRepository.deleteAll(futureOpen);
            timetableSlotRepository.flush();
        }
        if (!created.isEmpty()) {
            timetableSlotRepository.saveAll(created);
        }

        int rescheduled = rescheduledPerSubject.values().stream().mapToInt(Integer::intValue).sum();
        List<String> changes = explainChanges(resolvedTrigger, signals, missedSlots, rescheduled,
                futureCompleted.size(), removed, created.size(), window, effectiveSessionMinutes,
                sessionsPerDay, today, horizonEnd, supply);

        log.info("Adapted plan {} for student {} (trigger {}): -{} open slots, +{} slots, {} preserved, "
                        + "{} missed topics re-queued, horizon {} -> {}",
                timetable.getId(), studentId, resolvedTrigger, removed, created.size(),
                pastSlots.size() + futureCompleted.size(), rescheduled, today, horizonEnd);

        return AdaptationResponse.builder()
                .adapted(true)
                .trigger(resolvedTrigger)
                .summary(buildSummary(resolvedTrigger, created.size(), rescheduled, signals))
                .changes(changes)
                .slotsRemoved(removed)
                .slotsCreated(created.size())
                .slotsPreserved(pastSlots.size() + futureCompleted.size())
                .missedSessionsRescheduled(rescheduled)
                .horizonStart(today)
                .horizonEnd(horizonEnd)
                .subjects(toReadinessResponses(signals))
                .timetable(timetableService.getTimetable(studentId))
                .build();
    }

    // ---------------------------------------------------------------------------------------------
    // Signal collection
    // ---------------------------------------------------------------------------------------------

    /** Everything the planner needs to know about the student right now, read once. */
    private Signals collectSignals(Student student, List<Subject> subjects, LocalDate today) {
        UUID studentId = student.getId();

        Map<UUID, Double> avgMap = new HashMap<>();
        List<Object[]> avgData = marksRepository.findAveragePercentageBySubject(studentId);
        if (avgData != null) {
            for (Object[] row : avgData) {
                if (row.length >= 2 && row[0] instanceof UUID && row[1] instanceof Number) {
                    avgMap.put((UUID) row[0], ((Number) row[1]).doubleValue());
                }
            }
        }

        Set<UUID> subjectIds = subjects.stream().map(Subject::getId).collect(Collectors.toSet());
        List<Exam> upcomingExams = examRepository.findUpcomingExams(studentId, today);
        if (upcomingExams == null) upcomingExams = List.of();
        upcomingExams = upcomingExams.stream()
                .filter(e -> e.getExamDate() != null && e.getSubject() != null)
                .filter(e -> subjectIds.contains(e.getSubject().getId()))
                .sorted(Comparator.comparing(Exam::getExamDate))
                .collect(Collectors.toList());
        Map<UUID, Exam> nearestExam = new HashMap<>();
        for (Exam exam : upcomingExams) {
            nearestExam.putIfAbsent(exam.getSubject().getId(), exam);
        }

        List<TimetableSlot> completed = timetableSlotRepository.findCompletedSlotsForStudent(studentId);
        if (completed == null) completed = List.of();
        Set<String> coveredTopicKeys = completed.stream()
                .map(TimetableSlot::getTopic)
                .map(MaterialTopicReader::canonicalTopicKey)
                .filter(k -> !k.isEmpty())
                .collect(Collectors.toCollection(HashSet::new));

        List<TimetableSlot> missed = timetableSlotRepository.findMissedSlots(studentId, today);
        if (missed == null) missed = List.of();

        Map<UUID, Integer> completedBySubject = countBySubject(completed);
        Map<UUID, Integer> missedBySubject = countBySubject(missed);

        // Still-open sessions from today onwards, so readiness can say what is left to do.
        Map<UUID, Integer> upcomingBySubject = new HashMap<>();
        timetableRepository.findByStudentIdAndIsActiveTrue(studentId).ifPresent(active -> {
            List<TimetableSlot> slots = timetableSlotRepository.findAllByTimetableIdOrderBySlotDate(active.getId());
            if (slots == null) return;
            for (TimetableSlot slot : slots) {
                if (slot.getSubject() == null || slot.getSlotDate() == null) continue;
                if (slot.getSlotDate().isBefore(today) || Boolean.TRUE.equals(slot.getIsCompleted())) continue;
                upcomingBySubject.merge(slot.getSubject().getId(), 1, Integer::sum);
            }
        });

        Signals signals = new Signals();
        signals.student = student;
        signals.upcomingExams = upcomingExams;
        signals.coveredTopicKeys = coveredTopicKeys;

        double totalWeight = 0.0;
        for (Subject subject : subjects) {
            SubjectSignal sig = new SubjectSignal();
            sig.subject = subject;
            sig.averagePercentage = avgMap.get(subject.getId());
            sig.difficultyLevel = subject.getDifficultyLevel() != null
                    ? subject.getDifficultyLevel() : Constants.DEFAULT_SUBJECT_DIFFICULTY;
            sig.orderedTopics = materialTopicReader.distinctOrderedTopics(studentId, subject.getId());
            sig.totalTopics = sig.orderedTopics.size();
            sig.coveredTopics = (int) sig.orderedTopics.stream()
                    .map(MaterialTopicReader::canonicalTopicKey)
                    .filter(coveredTopicKeys::contains)
                    .count();
            sig.completedSessions = completedBySubject.getOrDefault(subject.getId(), 0);
            sig.missedSessions = missedBySubject.getOrDefault(subject.getId(), 0);
            sig.upcomingSessions = upcomingBySubject.getOrDefault(subject.getId(), 0);

            OptionalDouble matDiff = materialTopicReader.averageMaterialDifficulty(studentId, subject.getId());
            sig.materialDifficulty = matDiff.isPresent() ? matDiff.getAsDouble() : null;

            Exam next = nearestExam.get(subject.getId());
            if (next != null) {
                sig.nextExam = next;
                sig.daysUntilExam = ChronoUnit.DAYS.between(today, next.getExamDate());
            }

            sig.priorityWeight = computeWeight(sig);
            sig.examPreparedness = computeExamPreparedness(sig);
            sig.readiness = computeReadiness(sig, student);
            sig.stage = resolveStage(sig);
            totalWeight += sig.priorityWeight;
            signals.bySubject.put(subject.getId(), sig);
        }
        signals.totalWeight = totalWeight > 0 ? totalWeight : 1.0;

        // Daily minutes the student themselves configured — the only source for recommended durations.
        double availableHours = student.getAvailableHoursPerDay() != null
                ? student.getAvailableHoursPerDay().doubleValue()
                : Constants.DEFAULT_AVAILABLE_HOURS_PER_DAY;
        StudyTimeWindow window = StudyTimeWindow.fromSetting(student.getPreferredStudyTime());
        signals.dailyMinutes = Math.max(Constants.MIN_SLOT_DURATION_MINUTES,
                Math.min((int) Math.round(availableHours * 60), window.getWindowMinutes()));
        return signals;
    }

    private Map<UUID, Integer> countBySubject(List<TimetableSlot> slots) {
        Map<UUID, Integer> counts = new HashMap<>();
        for (TimetableSlot slot : slots) {
            if (slot.getSubject() == null) continue;
            counts.merge(slot.getSubject().getId(), 1, Integer::sum);
        }
        return counts;
    }

    /**
     * Scheduling weight for one subject. Higher weight → proportionally more sessions.
     *
     * <p>Signals, all real: marks average, declared subject difficulty, analysed material difficulty,
     * how much of the extracted material is still uncovered, how many of this subject's sessions were
     * missed, and how close its exam is. The base term matches the initial generator so adapting a
     * fresh plan does not reshuffle it for no reason.</p>
     */
    private double computeWeight(SubjectSignal sig) {
        double avg = sig.averagePercentage != null ? sig.averagePercentage : 50.0;
        double weight = (100.0 - avg) + (sig.difficultyLevel * 10.0);

        if (sig.daysUntilExam != null) {
            if (sig.daysUntilExam <= 3) weight += 50.0;
            else if (sig.daysUntilExam <= 7) weight += 30.0;
            else if (sig.daysUntilExam <= 14) weight += 15.0;
        }

        // Uncovered material pulls weight up; a subject whose material is done needs less new time.
        if (sig.totalTopics > 0) {
            double remaining = 1.0 - ((double) sig.coveredTopics / sig.totalTopics);
            weight += remaining * 25.0;
        }

        // Repeatedly skipped sessions need catching up, but the boost is capped so one bad week
        // cannot let a single subject swallow the whole plan.
        weight += Math.min(20.0, sig.missedSessions * 5.0);

        // Material the NLP pipeline scored as hard earns up to +10; easy material gives up to -10.
        if (sig.materialDifficulty != null) {
            weight += ((sig.materialDifficulty - 50.0) / 50.0) * 10.0;
        }

        return Math.max(1.0, weight);
    }

    /**
     * 0–100 exam preparedness for one subject: is topic coverage keeping pace with the exam clock?
     * 60 days out, 20% coverage is fine; 3 days out it is not, so the expected level rises as the exam
     * approaches. Returns {@code null} when the subject has no upcoming exam — there is no deadline to
     * be prepared for, so reporting a number would be inventing one.
     */
    private Double computeExamPreparedness(SubjectSignal sig) {
        if (sig.daysUntilExam == null) {
            return null;
        }
        double coverageScore = sig.coveragePercent();
        if (sig.daysUntilExam <= 0) {
            return clamp(coverageScore, 0, 100);       // exam is today: coverage is all that is left
        }
        double expected = 100.0 - Math.min(100.0, sig.daysUntilExam * 3.0);
        if (expected <= 0) {
            return 100.0;                              // far enough out that nothing is overdue yet
        }
        return clamp((coverageScore / expected) * 100.0, 0, 100);
    }

    /**
     * Composite 0–100 readiness for one subject: how the student is scoring, how much of the material
     * is actually covered, how reliably they attend that subject's sessions, and — once an exam is in
     * sight — whether coverage is keeping pace with the time left.
     */
    private double computeReadiness(SubjectSignal sig, Student student) {
        double marksScore = sig.averagePercentage != null ? clamp(sig.averagePercentage, 0, 100) : 50.0;
        double coverageScore = sig.coveragePercent();
        double consistencyScore = sig.consistencyPercent(student);

        // With an exam in sight, pace against the clock carries this term; before that there is no
        // deadline pressure to measure, so raw coverage stands in.
        double paceScore = sig.examPreparedness != null ? sig.examPreparedness : coverageScore;

        double readiness = (marksScore * 0.35) + (coverageScore * 0.30)
                + (consistencyScore * 0.20) + (paceScore * 0.15);
        return Math.round(clamp(readiness, 0, 100) * 10.0) / 10.0;
    }

    /** Which kind of work this subject needs next. */
    private String resolveStage(SubjectSignal sig) {
        boolean materialDone = sig.totalTopics > 0 && sig.coveredTopics >= sig.totalTopics;
        if (!materialDone) {
            return STAGE_LEARNING;
        }
        if (sig.daysUntilExam != null && sig.daysUntilExam <= 3) {
            return STAGE_FINAL_PREP;
        }
        if (sig.averagePercentage != null && sig.averagePercentage < WEAK_SUBJECT_THRESHOLD) {
            return STAGE_WEAK_AREA;
        }
        if (sig.averagePercentage != null && sig.averagePercentage >= 75.0) {
            return STAGE_PRACTICE;
        }
        return STAGE_REVISION;
    }

    // ---------------------------------------------------------------------------------------------
    // Topic assignment
    // ---------------------------------------------------------------------------------------------

    /**
     * Pick the label for the next session of a subject.
     *
     * <p>Order of preference: an overdue topic from a missed session, then the next uncovered
     * extracted topic in document order, then reinforcement work once the material is exhausted.
     * Reinforcement rotates revision / practice / weak-area drilling so the tail of a long plan is
     * not one word repeated, and the day before an exam is always explicit final revision.</p>
     */
    private TopicAssignment nextAssignment(Subject subject, SubjectSignal sig, List<PlannedTopic> queue,
                                           Map<UUID, Integer> supplyCursor,
                                           Map<UUID, Integer> reinforcementCursor,
                                           boolean isRevisionDay) {
        UUID id = subject.getId();
        int cursor = supplyCursor.getOrDefault(id, 0);

        if (!isRevisionDay && queue != null && cursor < queue.size()) {
            supplyCursor.put(id, cursor + 1);
            PlannedTopic planned = queue.get(cursor);
            String note = planned.missedOn != null
                    ? "Rescheduled from " + planned.missedOn + " (missed session caught up)"
                    : null;
            return new TopicAssignment(planned.label, note);
        }

        // Nothing new left to learn (or it is a revision day) → reinforcement.
        List<String> pool = !sig.orderedTopics.isEmpty()
                ? sig.orderedTopics
                : List.of(subject.getSubjectName());
        int r = reinforcementCursor.merge(id, 1, Integer::sum) - 1;
        String base = pool.get(r % pool.size());

        if (isRevisionDay) {
            return new TopicAssignment("Final revision: " + base,
                    "Exam-focused revision — every topic reviewed before the paper.");
        }
        boolean weak = sig.averagePercentage != null && sig.averagePercentage < WEAK_SUBJECT_THRESHOLD;
        switch (r % 3) {
            case 0:
                return new TopicAssignment("Revision: " + base,
                        "Spaced revision — material already covered once.");
            case 1:
                return new TopicAssignment("Practice: " + base,
                        "Applied practice — work problems rather than re-reading.");
            default:
                return weak
                        ? new TopicAssignment("Weak-area drill: " + base,
                                "Targeted drill: this subject's marks average is below target.")
                        : new TopicAssignment("Recap: " + base,
                                "Quick recap to keep a strong subject warm.");
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Explanations
    // ---------------------------------------------------------------------------------------------

    private String buildSummary(String trigger, int createdCount, int rescheduled, Signals signals) {
        String focus = signals.bySubject.values().stream()
                .max(Comparator.comparingDouble(s -> s.priorityWeight))
                .map(s -> s.subject.getSubjectName())
                .orElse(null);
        StringBuilder sb = new StringBuilder();
        switch (trigger) {
            case TRIGGER_SESSION_COMPLETED:
                sb.append("Session logged — your remaining plan was rebalanced");
                break;
            case TRIGGER_NEW_MATERIAL:
                sb.append("New material processed — its topics were added to your plan");
                break;
            case TRIGGER_EXAM_CHANGED:
                sb.append("Exam dates changed — urgency recalculated");
                break;
            case TRIGGER_MARKS_CHANGED:
                sb.append("New marks recorded — priorities recalculated");
                break;
            case TRIGGER_MISSED_SESSIONS:
                sb.append("Missed sessions caught up");
                break;
            default:
                sb.append("Plan adapted to your current progress");
        }
        sb.append(": ").append(createdCount).append(" upcoming session(s) rescheduled");
        if (rescheduled > 0) {
            sb.append(", ").append(rescheduled).append(" overdue topic(s) moved forward");
        }
        if (focus != null) {
            sb.append(". Top focus: ").append(focus).append('.');
        } else {
            sb.append('.');
        }
        return sb.toString();
    }

    /**
     * Human-readable reasons the plan changed. Deliberately derived from the same numbers that drove
     * the scheduling decisions, so the explanation can never disagree with the schedule on screen.
     */
    private List<String> explainChanges(String trigger, Signals signals, List<TimetableSlot> missedSlots,
                                        int rescheduled, int preservedFuture, int removed, int createdCount,
                                        StudyTimeWindow window, int sessionMinutes, int sessionsPerDay,
                                        LocalDate today, LocalDate horizonEnd, Map<UUID, List<PlannedTopic>> supply) {
        List<String> changes = new ArrayList<>();

        changes.add(String.format(
                "Rebuilt %d upcoming session(s) from %s to %s, keeping every past day and %d already-completed "
                        + "upcoming session untouched.",
                createdCount, today, horizonEnd, preservedFuture));

        changes.add(String.format(
                "Times come from your saved preference: %s, %d session(s) of %d minutes per day.",
                describeWindow(window), sessionsPerDay, sessionMinutes));

        if (rescheduled > 0) {
            LocalDate oldest = missedSlots.stream().map(TimetableSlot::getSlotDate)
                    .filter(java.util.Objects::nonNull).min(Comparator.naturalOrder()).orElse(null);
            changes.add(String.format(
                    "%d topic(s) from %d missed session(s)%s were pulled to the front of the queue so nothing "
                            + "overdue is skipped.",
                    rescheduled, missedSlots.size(), oldest != null ? " (oldest " + oldest + ")" : ""));
        } else if (!missedSlots.isEmpty()) {
            changes.add(String.format(
                    "%d past session(s) were never marked complete, but their topics are already covered "
                            + "elsewhere, so nothing needed re-queueing.", missedSlots.size()));
        }

        int totalCovered = signals.bySubject.values().stream().mapToInt(s -> s.coveredTopics).sum();
        int totalTopics = signals.bySubject.values().stream().mapToInt(s -> s.totalTopics).sum();
        if (totalTopics > 0) {
            changes.add(String.format(
                    "%d of %d topics extracted from your uploaded material are already covered by a completed "
                            + "session, so they were not scheduled again.", totalCovered, totalTopics));
        } else {
            // Only the subjects already in the plan are examined here, and adapt() deliberately never
            // widens that scope (see the planSubjects comment above). So a flat "no material was found"
            // actively misleads a student who *has* processed material for a subject this plan does not
            // happen to cover — it tells them to go and do the thing they already did. Name the subjects
            // actually looked at, and give both of the real routes to topic-level planning, since the
            // scope rule is otherwise invisible from the UI.
            String planned = signals.bySubject.values().stream()
                    .map(s -> s.subject.getSubjectName())
                    .sorted()
                    .collect(Collectors.joining(", "));
            changes.add(String.format(
                    "No processed material topics were found for the subject(s) in this plan (%s), so their "
                            + "sessions are named per subject. Process material for them — or generate a new "
                            + "plan to bring in a subject whose material is already processed — for "
                            + "topic-level planning.", planned));
        }

        // Per-subject rationale, strongest priority first, capped so the list stays readable.
        List<SubjectSignal> ranked = signals.bySubject.values().stream()
                .sorted(Comparator.comparingDouble((SubjectSignal s) -> s.priorityWeight).reversed())
                .collect(Collectors.toList());
        int limit = Math.min(4, ranked.size());
        for (int i = 0; i < limit; i++) {
            SubjectSignal sig = ranked.get(i);
            List<PlannedTopic> queue = supply.get(sig.subject.getId());
            int share = (int) Math.round((sig.priorityWeight / signals.totalWeight) * 100.0);
            StringBuilder sb = new StringBuilder();
            sb.append(sig.subject.getSubjectName()).append(" → ").append(share).append("% of sessions (");
            sb.append(String.join(", ", subjectReasons(sig)));
            sb.append(").");
            if (queue != null && queue.isEmpty() && sig.totalTopics > 0) {
                sb.append(" All material covered — now in ").append(stageLabel(sig.stage)).append('.');
            }
            changes.add(sb.toString());
        }

        if (removed > createdCount) {
            changes.add(String.format(
                    "%d open session(s) were removed and %d created — the plan now fits the time you actually "
                            + "have left inside your study window.", removed, createdCount));
        }
        return changes;
    }

    /** Short, factual reasons behind a subject's priority. */
    private List<String> subjectReasons(SubjectSignal sig) {
        List<String> reasons = new ArrayList<>();
        if (sig.averagePercentage != null) {
            if (sig.averagePercentage < WEAK_SUBJECT_THRESHOLD) {
                reasons.add(String.format("marks average %.0f%%", sig.averagePercentage));
            } else if (sig.averagePercentage >= 75.0) {
                reasons.add(String.format("strong marks %.0f%%", sig.averagePercentage));
            }
        } else {
            reasons.add("no marks recorded yet");
        }
        if (sig.daysUntilExam != null) {
            reasons.add(sig.daysUntilExam <= 0
                    ? "exam today"
                    : String.format("exam in %d day(s)", sig.daysUntilExam));
        }
        if (sig.totalTopics > 0) {
            reasons.add(String.format("%d/%d topics covered", sig.coveredTopics, sig.totalTopics));
        }
        if (sig.missedSessions > 0) {
            reasons.add(String.format("%d missed session(s)", sig.missedSessions));
        }
        if (sig.difficultyLevel >= 4) {
            reasons.add(String.format("difficulty %d/5", sig.difficultyLevel));
        }
        if (sig.materialDifficulty != null && sig.materialDifficulty >= 65.0) {
            reasons.add("material analysed as demanding");
        }
        if (reasons.isEmpty()) {
            reasons.add("routine maintenance");
        }
        return reasons;
    }

    private String stageLabel(String stage) {
        switch (stage) {
            case STAGE_FINAL_PREP: return "final exam preparation";
            case STAGE_WEAK_AREA:  return "weak-area reinforcement";
            case STAGE_PRACTICE:   return "applied practice";
            case STAGE_REVISION:   return "spaced revision";
            default:               return "learning new topics";
        }
    }

    private String describeWindow(StudyTimeWindow window) {
        return String.format("%s (%s–%s)", window.getLabel(), window.getStartTime(), window.getEndTime());
    }

    // ---------------------------------------------------------------------------------------------
    // Response mapping
    // ---------------------------------------------------------------------------------------------

    private List<SubjectReadinessResponse> toReadinessResponses(Signals signals) {
        return signals.bySubject.values().stream()
                .sorted(Comparator.comparingDouble((SubjectSignal s) -> s.priorityWeight).reversed())
                .map(sig -> {
                    double share = sig.priorityWeight / signals.totalWeight;
                    return SubjectReadinessResponse.builder()
                            .subjectId(sig.subject.getId())
                            .subjectName(sig.subject.getSubjectName())
                            .averagePercentage(sig.averagePercentage)
                            .difficultyLevel(sig.difficultyLevel)
                            .totalTopics(sig.totalTopics)
                            .coveredTopics(sig.coveredTopics)
                            .coveragePercent(round1(sig.coveragePercent()))
                            .completedSessions(sig.completedSessions)
                            .missedSessions(sig.missedSessions)
                            .upcomingSessions(sig.upcomingSessions)
                            .consistencyPercent(round1(sig.consistencyPercent(signals.student)))
                            .materialDifficulty(sig.materialDifficulty != null ? round1(sig.materialDifficulty) : null)
                            .nextExamDate(sig.nextExam != null ? sig.nextExam.getExamDate() : null)
                            .daysUntilExam(sig.daysUntilExam)
                            .readiness(sig.readiness)
                            .examPreparedness(sig.examPreparedness != null ? round1(sig.examPreparedness) : null)
                            .priorityWeight(round1(sig.priorityWeight))
                            .sessionSharePercent(round1(share * 100.0))
                            .recommendedStudyTime(formatMinutes(recommendedMinutes(signals, share)))
                            .allTopicsCovered(sig.totalTopics > 0 && sig.coveredTopics >= sig.totalTopics)
                            .stage(sig.stage)
                            .reasons(subjectReasons(sig))
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Daily minutes to recommend for a subject: its share of the student's <em>own</em> configured
     * daily study time, snapped to a 5-minute grid and never below one minimum-length session.
     */
    private int recommendedMinutes(Signals signals, double share) {
        int minutes = (int) Math.round(signals.dailyMinutes * share);
        minutes = (int) (Math.round(minutes / 5.0) * 5);
        return Math.max(Constants.MIN_SLOT_DURATION_MINUTES, Math.min(signals.dailyMinutes, minutes));
    }

    /** {@code 135 -> "2h 15m"}, {@code 120 -> "2h"}, {@code 45 -> "45m"}. */
    public static String formatMinutes(int minutes) {
        int hours = minutes / 60;
        int mins = minutes % 60;
        if (hours == 0) return mins + "m";
        if (mins == 0) return hours + "h";
        return hours + "h " + mins + "m";
    }

    // ---------------------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------------------

    /** Distinct subjects appearing in a plan, ordered by name so output is deterministic. */
    private List<Subject> distinctSubjects(List<TimetableSlot> slots) {
        Map<UUID, Subject> unique = new LinkedHashMap<>();
        for (TimetableSlot slot : slots) {
            if (slot.getSubject() != null) {
                unique.putIfAbsent(slot.getSubject().getId(), slot.getSubject());
            }
        }
        return unique.values().stream()
                .sorted(Comparator.comparing(s -> s.getSubjectName() == null ? "" : s.getSubjectName()))
                .collect(Collectors.toList());
    }

    /**
     * Session length of the plan being adapted, taken as the most common slot duration. This is how
     * the student's chosen study style (intense / balanced / relaxed) survives an adaptation.
     */
    private int inferSessionMinutes(List<TimetableSlot> slots) {
        Map<Integer, Integer> histogram = new HashMap<>();
        for (TimetableSlot slot : slots) {
            if (slot.getStartTime() == null || slot.getEndTime() == null) continue;
            int minutes = (int) Duration.between(slot.getStartTime(), slot.getEndTime()).toMinutes();
            if (minutes >= Constants.MIN_SLOT_DURATION_MINUTES) {
                histogram.merge(minutes, 1, Integer::sum);
            }
        }
        return histogram.entrySet().stream()
                .max(Map.Entry.<Integer, Integer>comparingByValue()
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(Map.Entry::getKey)
                .orElse(Constants.SESSION_MINUTES_BALANCED);
    }

    /**
     * Smooth weighted round-robin: higher-weight subjects appear proportionally more often while every
     * subject stays interleaved. Same algorithm the initial generator uses, so a freshly generated
     * plan and an adapted one have the same texture.
     */
    private List<Subject> buildWeightedSessionOrder(List<Subject> subjects, Map<UUID, Double> subjectWeights,
                                                    int totalSessions) {
        List<Subject> order = new ArrayList<>();
        if (subjects.isEmpty() || totalSessions <= 0) return order;

        Map<UUID, Double> weights = new HashMap<>();
        double totalWeight = 0.0;
        for (Subject s : subjects) {
            double w = subjectWeights.getOrDefault(s.getId(), 1.0);
            if (w <= 0) w = 1.0;
            weights.put(s.getId(), w);
            totalWeight += w;
        }

        Map<UUID, Double> current = new HashMap<>();
        for (Subject s : subjects) current.put(s.getId(), 0.0);

        for (int i = 0; i < totalSessions; i++) {
            Subject chosen = null;
            for (Subject s : subjects) {
                double cw = current.get(s.getId()) + weights.get(s.getId());
                current.put(s.getId(), cw);
                if (chosen == null || cw > current.get(chosen.getId())) {
                    chosen = s;
                }
            }
            current.put(chosen.getId(), current.get(chosen.getId()) - totalWeight);
            order.add(chosen);
        }
        return order;
    }

    /**
     * Day-before-the-exam revision for every exam whose eve falls inside the horizon. Mirrors the
     * generator so the "revise the day before" guarantee is not lost when a plan is adapted. The exam
     * itself may fall just after the horizon — what matters is that the eve is a day we can schedule.
     */
    private Map<UUID, LocalDate> buildExamEveMap(List<Exam> upcomingExams, LocalDate startDate, LocalDate endDate) {
        Map<UUID, LocalDate> eves = new HashMap<>();
        for (Exam exam : upcomingExams) {
            if (exam.getSubject() == null || exam.getExamDate() == null) continue;
            LocalDate eve = exam.getExamDate().minusDays(1);
            if (eve.isAfter(endDate) || eve.isBefore(startDate)) continue;
            UUID subjectId = exam.getSubject().getId();
            LocalDate existing = eves.get(subjectId);
            if (existing == null || eve.isBefore(existing)) {
                eves.put(subjectId, eve);
            }
        }
        return eves;
    }

    /**
     * Minutes left between {@code from} and the end of the study window. Computed as a duration rather
     * than by adding to {@code from}, so a late window (which ends at 23:59) cannot wrap past midnight
     * and appear to have room.
     */
    private static int minutesUntilWindowEnd(LocalTime from, StudyTimeWindow window) {
        return (int) Duration.between(from, window.getEndTime()).toMinutes();
    }

    private static LocalTime roundUpToFiveMinutes(LocalTime time) {
        int minute = time.getMinute();
        int rounded = ((minute + 4) / 5) * 5;
        if (rounded >= 60) {
            return time.getHour() == 23 ? LocalTime.of(23, 59) : LocalTime.of(time.getHour() + 1, 0);
        }
        return LocalTime.of(time.getHour(), rounded);
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    // ---------------------------------------------------------------------------------------------
    // Internal value holders
    // ---------------------------------------------------------------------------------------------

    /** All signals for one adaptation pass, gathered once. */
    static final class Signals {
        Student student;
        List<Exam> upcomingExams = List.of();
        Set<String> coveredTopicKeys = new HashSet<>();
        Map<UUID, SubjectSignal> bySubject = new LinkedHashMap<>();
        double totalWeight = 1.0;
        int dailyMinutes = 60;
    }

    /** Signals for one subject. */
    static final class SubjectSignal {
        Subject subject;
        Double averagePercentage;
        int difficultyLevel = Constants.DEFAULT_SUBJECT_DIFFICULTY;
        List<String> orderedTopics = List.of();
        int totalTopics;
        int coveredTopics;
        int completedSessions;
        int missedSessions;
        int upcomingSessions;
        Double materialDifficulty;
        Exam nextExam;
        Long daysUntilExam;
        double priorityWeight = 1.0;
        double readiness;
        /** Pace-against-the-exam-clock score, or null when this subject has no upcoming exam. */
        Double examPreparedness;
        String stage = STAGE_LEARNING;

        /** Coverage of extracted topics, falling back to session completion when there is no material. */
        double coveragePercent() {
            if (totalTopics > 0) {
                return clamp(((double) coveredTopics / totalTopics) * 100.0, 0, 100);
            }
            int attempted = completedSessions + missedSessions;
            return attempted > 0 ? clamp(((double) completedSessions / attempted) * 100.0, 0, 100) : 0.0;
        }

        /**
         * Real attendance: completed vs. (completed + missed). Before any session has come due there
         * is nothing to measure, so the student's streak is used as the only available signal instead
         * of penalising them for a plan they have not reached yet.
         */
        double consistencyPercent(Student student) {
            int attempted = completedSessions + missedSessions;
            if (attempted > 0) {
                return clamp(((double) completedSessions / attempted) * 100.0, 0, 100);
            }
            int streak = student != null && student.getStudyStreak() != null ? student.getStudyStreak() : 0;
            return clamp((streak / 7.0) * 100.0, 0, 100);
        }
    }

    /** A topic queued for a future session, remembering the missed date it is catching up (if any). */
    private static final class PlannedTopic {
        final String label;
        final LocalDate missedOn;

        PlannedTopic(String label, LocalDate missedOn) {
            this.label = label;
            this.missedOn = missedOn;
        }
    }

    /** A chosen label plus the provenance note stored on the slot. */
    private static final class TopicAssignment {
        final String label;
        final String note;

        TopicAssignment(String label, String note) {
            this.label = label;
            this.note = note;
        }
    }

    /** Free capacity on one day: where sessions may start and how many still fit. */
    private static final class DaySlotPlan {
        final LocalDate date;
        final LocalTime startTime;
        final int freeSessions;

        DaySlotPlan(LocalDate date, LocalTime startTime, int freeSessions) {
            this.date = date;
            this.startTime = startTime;
            this.freeSessions = freeSessions;
        }
    }
}

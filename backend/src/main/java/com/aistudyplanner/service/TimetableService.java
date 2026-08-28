package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.dto.request.GenerateTimetableRequest;
import com.aistudyplanner.model.dto.request.SlotRequest;
import com.aistudyplanner.model.dto.request.TimetableRequest;
import com.aistudyplanner.model.dto.response.SlotResponse;
import com.aistudyplanner.model.dto.response.TimetableResponse;
import com.aistudyplanner.model.StudyTimeWindow;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final SubjectRepository subjectRepository;
    private final MarksRepository marksRepository;
    private final ExamRepository examRepository;
    private final StudentRepository studentRepository;
    private final MaterialTopicReader materialTopicReader;
    private final GroqService groqService;

    @Transactional
    public TimetableResponse generateAiTimetable(UUID studentId, GenerateTimetableRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        LocalDate startDate = request.getStartDate();
        double availableHours = request.getAvailableHoursPerDay().doubleValue();

        // Resolve the subjects to plan for FIRST — the exam deadline that defines the planning
        // horizon must be read from these specific subjects.
        List<Subject> allSubjects = subjectRepository.findAllByStudentId(studentId, org.springframework.data.domain.PageRequest.of(0, 100));
        if (allSubjects.isEmpty()) {
            throw new IllegalArgumentException("No subjects found. Please add subjects first.");
        }
        List<Subject> subjects;
        if (request.getSubjectIds() != null && !request.getSubjectIds().isEmpty()) {
            final List<UUID> requestedIds = request.getSubjectIds();
            subjects = allSubjects.stream()
                    .filter(s -> requestedIds.contains(s.getId()))
                    .collect(Collectors.toList());
            if (subjects.isEmpty()) {
                throw new IllegalArgumentException("None of the selected subjects were found for this student.");
            }
        } else {
            subjects = allSubjects;
        }

        // Upcoming, not-yet-completed exams for these subjects (earliest first). The exam date is the
        // real deadline, so this drives BOTH the planning horizon and subject prioritisation.
        List<Exam> upcomingExams = findUpcomingExamsForSubjects(studentId, subjects, startDate);

        // ---- Planning horizon: START -> the actual deadline. There is NO fixed maximum window. ----
        // Precedence:
        //   1) an explicit target deadline the user typed into the UI (their explicit choice wins);
        //   2) otherwise the FURTHEST upcoming exam for the selected subjects, so a 7/30/60/90-day-away
        //      exam yields a 7/30/60/90-day plan and a long horizon is never truncated to a fixed cap;
        //   3) otherwise an explicitly requested duration (there are no exams to plan around);
        //   4) otherwise a short default.
        LocalDate endDate;
        int actualDurationDays;
        LocalDate latestExamDate = upcomingExams.stream()
                .map(Exam::getExamDate)
                .max(Comparator.naturalOrder())
                .orElse(null);

        boolean useDeadlines = request.getUseDeadlines() == null || Boolean.TRUE.equals(request.getUseDeadlines());

        if (request.getTargetDeadlineDate() != null) {
            endDate = request.getTargetDeadlineDate();
            actualDurationDays = (int) ChronoUnit.DAYS.between(startDate, endDate);
            if (actualDurationDays < 1) {
                throw new IllegalArgumentException("Target deadline must be after start date");
            }
        } else if (useDeadlines && latestExamDate != null && latestExamDate.isAfter(startDate)) {
            // Dynamic horizon: span every day from the start up to the last exam.
            endDate = latestExamDate;
            actualDurationDays = (int) ChronoUnit.DAYS.between(startDate, endDate);
            log.info("Planning horizon derived from exam deadline: {} preparation days (start {} -> exam {})",
                    actualDurationDays, startDate, endDate);
        } else if (request.getDurationDays() != null) {
            actualDurationDays = request.getDurationDays();
            endDate = startDate.plusDays(actualDurationDays);
        } else {
            actualDurationDays = com.aistudyplanner.util.Constants.DAYS_PER_WEEK * 2;
            endDate = startDate.plusDays(actualDurationDays);
        }

        log.info("Generating timetable from {} to {} ({} days)", startDate, endDate, actualDurationDays);

        // Subject weights: weaker performance + higher difficulty + nearer exams => more sessions.
        Map<UUID, Double> subjectWeights = calculateSubjectWeights(studentId, subjects, upcomingExams, startDate);

        // Revision-before-each-exam: for any exam that falls INSIDE the plan (before the last study
        // day) reserve the day before it as revision for that subject. The final exam (at the horizon
        // end) is already covered by the generator's final-day revision.
        Map<UUID, LocalDate> examEveBySubject = buildExamEveMap(upcomingExams, startDate, endDate);

        // Deactivate all other timetables
        deactivateExistingTimetables(studentId);

        // Create new timetable with start date
        Timetable timetable = createNewTimetable(student, startDate, actualDurationDays);

        // Generate slots for actual duration.
        // Time source = the student's preferred study window; pace/session length = the requested style.
        List<TimetableSlot> slots = generateTimetableSlotsForDuration(
            timetable,
            subjects,
            subjectWeights,
            availableHours,
            startDate,
            actualDurationDays,
            request.getStyle(),
            examEveBySubject
        );
        timetableSlotRepository.saveAll(slots);

        log.info("Generated {} slots for {} days", slots.size(), actualDurationDays);

        return getTimetable(studentId);
    }

    /**
     * Upcoming, not-yet-completed exams for the given subjects on/after {@code fromDate}, earliest
     * first. Null-safe against a repository that returns no page (e.g. an unstubbed mock in tests).
     */
    private List<Exam> findUpcomingExamsForSubjects(UUID studentId, List<Subject> subjects, LocalDate fromDate) {
        Set<UUID> subjectIds = subjects.stream().map(Subject::getId).collect(Collectors.toSet());
        org.springframework.data.domain.Page<Exam> page = examRepository
                .findAllByStudentIdOrderByExamDateAsc(studentId, org.springframework.data.domain.PageRequest.of(0, 500));
        if (page == null) {
            return new ArrayList<>();
        }
        return page.getContent().stream()
                .filter(e -> e.getExamDate() != null)
                .filter(e -> !Boolean.TRUE.equals(e.getIsCompleted()))
                .filter(e -> !e.getExamDate().isBefore(fromDate))
                .filter(e -> e.getSubject() != null && subjectIds.contains(e.getSubject().getId()))
                .sorted(Comparator.comparing(Exam::getExamDate))
                .collect(Collectors.toList());
    }

    /**
     * For every subject whose exam falls strictly INSIDE the plan (before the horizon end), map the
     * subject to the day immediately before that exam so the generator can dedicate it to revision.
     * The exam at the horizon end is handled by the generator's final-day revision, so it is skipped
     * here. When a subject has several in-window exams the earliest eve is kept.
     */
    private Map<UUID, LocalDate> buildExamEveMap(List<Exam> upcomingExams, LocalDate startDate, LocalDate endDate) {
        Map<UUID, LocalDate> eves = new HashMap<>();
        for (Exam exam : upcomingExams) {
            if (exam.getSubject() == null || exam.getExamDate() == null) continue;
            LocalDate examDate = exam.getExamDate();
            if (!examDate.isBefore(endDate)) continue;          // only exams before the horizon end
            LocalDate eve = examDate.minusDays(1);
            if (eve.isBefore(startDate)) continue;               // no room to revise before it
            UUID subjectId = exam.getSubject().getId();
            LocalDate existing = eves.get(subjectId);
            if (existing == null || eve.isBefore(existing)) {
                eves.put(subjectId, eve);
            }
        }
        return eves;
    }

    /**
     * Calculate weight for each subject based on performance, difficulty and exam urgency. The exam
     * list is the already-resolved upcoming exams for the selected subjects (no fixed look-ahead cap),
     * so an exam far in the future is still considered — it simply carries no urgency bonus yet.
     *
     * @param referenceDate the day the plan starts; exam urgency is measured from here rather than
     *                      from "now", so a plan that starts next week weights its exams correctly
     */
    private Map<UUID, Double> calculateSubjectWeights(UUID studentId, List<Subject> subjects,
                                                      List<Exam> upcomingExams, LocalDate referenceDate) {
        Map<UUID, Double> subjectAverages = new HashMap<>();
        List<Object[]> avgData = marksRepository.findAveragePercentageBySubject(studentId);
        for (Object[] row : avgData) {
            subjectAverages.put((UUID) row[0], ((Number) row[1]).doubleValue());
        }

        Map<UUID, Double> subjectWeights = new HashMap<>();
        for (Subject subject : subjects) {
            double weight = calculateIndividualWeight(subject, subjectAverages, upcomingExams, referenceDate);
            subjectWeights.put(subject.getId(), weight);
            log.debug("Subject {} weight: {}", subject.getSubjectName(), weight);
        }
        return subjectWeights;
    }

    /**
     * Calculate weight for a single subject. Weaker performance and higher difficulty raise the base
     * weight; a near exam adds an urgency bonus. There is no maximum look-ahead — a distant exam just
     * produces a large day count and therefore no bonus.
     */
    private double calculateIndividualWeight(Subject subject, Map<UUID, Double> subjectAverages,
                                             List<Exam> upcomingExams, LocalDate referenceDate) {
        double avg = subjectAverages.getOrDefault(subject.getId(), 50.0);
        double diffLevel = subject.getDifficultyLevel() != null ? subject.getDifficultyLevel() : com.aistudyplanner.util.Constants.DEFAULT_SUBJECT_DIFFICULTY;
        double weight = (100 - avg) + (diffLevel * 10);

        long minDaysToExam = Long.MAX_VALUE;
        for (Exam exam : upcomingExams) {
            if (exam.getSubject() != null && exam.getSubject().getId().equals(subject.getId()) && exam.getExamDate() != null) {
                long days = ChronoUnit.DAYS.between(referenceDate, exam.getExamDate());
                if (days < minDaysToExam) minDaysToExam = days;
            }
        }

        if (minDaysToExam <= 3) {
            weight += 50;
        } else if (minDaysToExam <= 7) {
            weight += 30;
        }
        return weight;
    }

    /**
     * Deactivate all other timetables for the student
     */
    private void deactivateExistingTimetables(UUID studentId) {
        List<Timetable> existing = timetableRepository.findAllByStudentId(studentId);
        for (Timetable t : existing) {
            t.setIsActive(false);
            timetableRepository.save(t);
        }
    }

    /**
     * Create a new active timetable for the student
     */
    private Timetable createNewTimetable(Student student, LocalDate weekStartDate, int durationDays) {
        String title = String.format("Study Plan: %s to %s", 
            weekStartDate.toString(), 
            weekStartDate.plusDays(durationDays).toString());
            
        Timetable timetable = Timetable.builder()
                .student(student)
                .weekStartDate(weekStartDate)
                .title(title)
                .isAiGenerated(true)
                .isActive(true)
                .build();
        return timetableRepository.save(timetable);
    }

    /**
     * Generate all study slots across the full plan duration.
     *
     * <p>Design (matches the product spec — user settings drive <i>time</i>, materials drive
     * <i>topics</i>, performance/exams drive <i>priority</i>):</p>
     * <ul>
     *   <li><b>When</b>: start times come from the student's preferred {@link StudyTimeWindow}
     *       (no hard-coded clock time). Each day is filled from the window start with fixed-length
     *       sessions separated by a short buffer, never exceeding the window or the requested hours.</li>
     *   <li><b>How long</b>: session length is derived from the requested study {@code style}
     *       (intense/balanced/relaxed).</li>
     *   <li><b>Which subject</b>: a smooth weighted round-robin over subject weights (weaker
     *       performance, higher difficulty, nearer exams → more weight → more sessions) picks the
     *       subject of each session, while still interleaving every subject rather than starving any.</li>
     *   <li><b>What topic</b>: each subject's extracted material topics are consumed <i>in document
     *       order</i> via a per-subject cursor — real topics, progressing, not repeating. Once a
     *       subject's topics are exhausted (and on the final day) sessions become spaced revision.</li>
     * </ul>
     */
    private List<TimetableSlot> generateTimetableSlotsForDuration(
            Timetable timetable,
            List<Subject> subjects,
            Map<UUID, Double> subjectWeights,
            double availableHours,
            LocalDate startDate,
            int durationDays,
            String style,
            Map<UUID, LocalDate> examEveBySubject) {

        List<TimetableSlot> slotsToSave = new ArrayList<>();
        if (subjects.isEmpty() || durationDays <= 0) {
            return slotsToSave;
        }

        // TIME comes from the user's saved preference — never a hard-coded clock time.
        StudyTimeWindow window = StudyTimeWindow.fromSetting(timetable.getStudent().getPreferredStudyTime());
        int sessionMinutes = sessionMinutesForStyle(style);
        int buffer = com.aistudyplanner.util.Constants.BUFFER_BETWEEN_SLOTS_MINUTES;

        // Daily budget = the smaller of what the user asked for and what their window physically allows,
        // so we honour both "available hours per day" and "only study inside my chosen window".
        int requestedDailyMinutes = (int) Math.round(availableHours * 60);
        int dailyMinutes = Math.min(requestedDailyMinutes, window.getWindowMinutes());
        if (dailyMinutes <= 0) {
            dailyMinutes = sessionMinutes;
        }

        // Whole sessions that fit the budget: n*session + (n-1)*buffer <= dailyMinutes.
        int sessionsPerDay = (dailyMinutes + buffer) / (sessionMinutes + buffer);
        int effectiveSessionMinutes = sessionMinutes;
        if (sessionsPerDay < 1) {
            // Window/hours smaller than one full session — still schedule one, clamped to the budget.
            sessionsPerDay = 1;
            effectiveSessionMinutes = Math.max(com.aistudyplanner.util.Constants.MIN_SLOT_DURATION_MINUTES, dailyMinutes);
        }

        // Pre-compute each subject's ordered topic list (document order preserved) and progress cursors.
        Map<UUID, List<String>> orderedTopics = new HashMap<>();
        Map<UUID, Integer> topicCursor = new HashMap<>();
        Map<UUID, Integer> revisionCursor = new HashMap<>();
        for (Subject subject : subjects) {
            orderedTopics.put(subject.getId(), getOrderedTopicsForSubject(timetable.getStudent().getId(), subject.getId()));
            topicCursor.put(subject.getId(), 0);
            revisionCursor.put(subject.getId(), 0);
        }

        // Priority-weighted, evenly-spread ordering of which subject each session belongs to.
        List<Subject> sessionOrder = buildWeightedSessionOrder(subjects, subjectWeights, sessionsPerDay * durationDays);

        int globalSession = 0;
        for (int dayOffset = 0; dayOffset < durationDays; dayOffset++) {
            LocalDate currentDate = startDate.plusDays(dayOffset);
            // Store Monday=0 .. Sunday=6 (matches the entity contract and the weekly grid on the client).
            int dayOfWeek = (currentDate.getDayOfWeek().getValue() + 6) % 7;
            boolean isFinalDay = (dayOffset == durationDays - 1);

            LocalTime currentTime = window.getStartTime();
            for (int s = 0; s < sessionsPerDay && globalSession < sessionOrder.size(); s++, globalSession++) {
                Subject subject = sessionOrder.get(globalSession);
                LocalDate examEve = examEveBySubject.get(subject.getId());
                String topic;
                if (examEve != null && examEve.equals(currentDate)) {
                    // The day before this subject's (interior) exam — dedicate the session to revision.
                    topic = revisionTopicForSubject(subject, orderedTopics, revisionCursor);
                } else {
                    topic = nextTopicForSubject(subject, orderedTopics, topicCursor, revisionCursor, isFinalDay);
                }

                TimetableSlot slot = TimetableSlot.builder()
                        .timetable(timetable)
                        .subject(subject)
                        .dayOfWeek(dayOfWeek)
                        .slotDate(currentDate)
                        .startTime(currentTime)
                        .endTime(currentTime.plusMinutes(effectiveSessionMinutes))
                        .topic(topic)
                        .isCompleted(false)
                        .build();
                slotsToSave.add(slot);

                currentTime = currentTime.plusMinutes(effectiveSessionMinutes + buffer);
            }
        }

        log.info("Generated {} slots across {} days ({} sessions/day, {}-min {} sessions, window {} {}-{})",
                slotsToSave.size(), durationDays, sessionsPerDay, effectiveSessionMinutes,
                style, window.name(), window.getStartTime(), window.getEndTime());
        return slotsToSave;
    }

    /** Session length in minutes for the requested study style. */
    private int sessionMinutesForStyle(String style) {
        if (style == null) return com.aistudyplanner.util.Constants.SESSION_MINUTES_BALANCED;
        switch (style.trim().toLowerCase()) {
            case "intense": return com.aistudyplanner.util.Constants.SESSION_MINUTES_INTENSE;
            case "relaxed": return com.aistudyplanner.util.Constants.SESSION_MINUTES_RELAXED;
            case "balanced":
            default:        return com.aistudyplanner.util.Constants.SESSION_MINUTES_BALANCED;
        }
    }

    /**
     * Read a subject's extracted material topics in their natural document order (chapter/topic
     * sequence preserved), formatted as "Chapter - Topic". Returns an empty list when the subject has
     * no processed material, so the caller can fall back cleanly.
     *
     * <p>Delegates to {@link MaterialTopicReader} so the initial generator and the adaptive
     * re-planner produce identical labels — adaptive planning matches candidate topics against the
     * topics on completed slots, which only works while both paths format them the same way.</p>
     */
    private List<String> getOrderedTopicsForSubject(UUID studentId, UUID subjectId) {
        return materialTopicReader.orderedTopics(studentId, subjectId);
    }

    /**
     * Next topic label for a subject's session. Walks the ordered topic list once (in order, no
     * repeats) to progress through the material, then switches to spaced revision that cycles back
     * through the same topics. On the final day every session is explicit revision. When a subject
     * has no extracted material, falls back to a subject-specific (non-generic) session label.
     */
    private String nextTopicForSubject(Subject subject, Map<UUID, List<String>> orderedTopics,
                                       Map<UUID, Integer> topicCursor, Map<UUID, Integer> revisionCursor,
                                       boolean isFinalDay) {
        List<String> topics = orderedTopics.getOrDefault(subject.getId(), Collections.emptyList());

        if (topics.isEmpty()) {
            // No processed material for this subject — do NOT invent generic topics; use a clear,
            // subject-specific session label instead. Still honour revision before the exam: the
            // final day becomes explicit revision even when there is nothing extracted to cycle.
            if (isFinalDay) {
                return "Final revision: " + subject.getSubjectName();
            }
            int n = topicCursor.merge(subject.getId(), 1, Integer::sum);
            return subject.getSubjectName() + " — study session " + n;
        }

        int cursor = topicCursor.getOrDefault(subject.getId(), 0);
        if (!isFinalDay && cursor < topics.size()) {
            topicCursor.put(subject.getId(), cursor + 1);
            return topics.get(cursor);
        }

        // Topics covered (or final day) → spaced revision, cycling through the material in order.
        int rev = revisionCursor.getOrDefault(subject.getId(), 0);
        revisionCursor.put(subject.getId(), rev + 1);
        String base = topics.get(rev % topics.size());
        String label = (isFinalDay ? "Final revision: " : "Revision: ") + base;
        return label.length() > 200 ? label.substring(0, 200) : label;
    }

    /**
     * Revision label for the day before a subject's (interior) exam — cycles through the subject's
     * material for review, or names the subject when it has no processed material. Kept consistent with
     * the "Revision: " prefix used elsewhere so downstream display/logic treats it uniformly.
     */
    private String revisionTopicForSubject(Subject subject, Map<UUID, List<String>> orderedTopics,
                                           Map<UUID, Integer> revisionCursor) {
        List<String> topics = orderedTopics.getOrDefault(subject.getId(), Collections.emptyList());
        if (topics.isEmpty()) {
            return "Revision: " + subject.getSubjectName();
        }
        int rev = revisionCursor.getOrDefault(subject.getId(), 0);
        revisionCursor.put(subject.getId(), rev + 1);
        String label = "Revision: " + topics.get(rev % topics.size());
        return label.length() > 200 ? label.substring(0, 200) : label;
    }

    /**
     * Build a flat, priority-weighted ordering of which subject each of {@code totalSessions} sessions
     * belongs to, using smooth weighted round-robin. Higher-weight subjects appear proportionally more
     * often, yet every subject with a positive weight is still interleaved throughout the plan.
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

    @Transactional(readOnly = true)
    public TimetableResponse getTimetable(UUID studentId) {
        Timetable timetable = timetableRepository.findByStudentIdAndIsActiveTrue(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("No active timetable found"));

        // Use true chronological ordering by concrete slotDate
        List<TimetableSlot> slots = timetableSlotRepository.findAllByTimetableIdOrderBySlotDate(timetable.getId());
        List<SlotResponse> slotResponses = slots.stream()
                .map(slot -> toSlotResponse(slot, timetable.getWeekStartDate()))
                .collect(Collectors.toList());

        return TimetableResponse.builder()
                .id(timetable.getId())
                .title(timetable.getTitle())
                .weekStartDate(timetable.getWeekStartDate())
                .isAiGenerated(timetable.getIsAiGenerated())
                .isActive(timetable.getIsActive())
                .slots(slotResponses)
                .createdAt(timetable.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> getAllTimetables(UUID studentId) {
        // Use JOIN FETCH to load all timetables with slots in single query
        List<Timetable> timetables = timetableRepository.findAllByStudentIdWithSlots(studentId);
        
        return timetables.stream().map(t -> {
            List<SlotResponse> slots = t.getSlots().stream()
                    .map(slot -> toSlotResponse(slot, t.getWeekStartDate()))
                    .collect(Collectors.toList());
            
            return TimetableResponse.builder()
                    .id(t.getId())
                    .title(t.getTitle())
                    .weekStartDate(t.getWeekStartDate())
                    .isAiGenerated(t.getIsAiGenerated())
                    .isActive(t.getIsActive())
                    .slots(slots)
                    .createdAt(t.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public SlotResponse updateSlot(UUID studentId, UUID slotId, SlotRequest request) {
        TimetableSlot slot = timetableSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Slot not found"));

        if (!slot.getTimetable().getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Slot does not belong to student");
        }

        if (request.getSubjectId() != null) {
            Subject subject = subjectRepository.findById(request.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            slot.setSubject(subject);
        }
        
        if (request.getDayOfWeek() != null) slot.setDayOfWeek(request.getDayOfWeek());
        if (request.getStartTime() != null) slot.setStartTime(request.getStartTime());
        if (request.getEndTime() != null) slot.setEndTime(request.getEndTime());
        if (request.getTopic() != null) slot.setTopic(request.getTopic());

        slot = timetableSlotRepository.save(slot);
        return toSlotResponse(slot, slot.getTimetable().getWeekStartDate());
    }

    @Transactional
    public SlotResponse markSlotComplete(UUID studentId, UUID slotId) {
        TimetableSlot slot = timetableSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Slot not found"));

        if (!slot.getTimetable().getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Slot does not belong to student");
        }

        boolean wasCompleted = Boolean.TRUE.equals(slot.getIsCompleted());
        slot.setIsCompleted(!wasCompleted);
        slot = timetableSlotRepository.save(slot);

        // Feedback loop: update student streak and active date upon completing a study session
        if (!wasCompleted) {
            Student student = slot.getTimetable().getStudent();
            LocalDate today = LocalDate.now();
            if (student.getLastActiveDate() == null || !student.getLastActiveDate().equals(today)) {
                if (student.getLastActiveDate() != null && ChronoUnit.DAYS.between(student.getLastActiveDate(), today) == 1) {
                    student.setStudyStreak((student.getStudyStreak() != null ? student.getStudyStreak() : 0) + 1);
                } else if (student.getStudyStreak() == null || student.getStudyStreak() == 0) {
                    student.setStudyStreak(1);
                }
                student.setLastActiveDate(today);
                studentRepository.save(student);
            }
        }

        return toSlotResponse(slot, slot.getTimetable().getWeekStartDate());
    }

    @Transactional
    public void deleteTimetable(UUID studentId, UUID timetableId) {
        Timetable timetable = timetableRepository.findById(timetableId)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable not found"));

        if (!timetable.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Timetable does not belong to student");
        }

        timetableRepository.delete(timetable);
    }

    @Transactional
    public TimetableResponse customCreateTimetable(UUID studentId, TimetableRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        List<Timetable> existing = timetableRepository.findAllByStudentId(studentId);
        for (Timetable t : existing) {
            t.setIsActive(false);
            timetableRepository.save(t);
        }

        Timetable timetable = Timetable.builder()
                .student(student)
                .weekStartDate(LocalDate.now())  // Set to current week start for custom timetables
                .isAiGenerated(false)
                .isActive(true)
                .build();
        timetable = timetableRepository.save(timetable);

        return getTimetable(studentId);
    }

    private SlotResponse toSlotResponse(TimetableSlot slot, LocalDate weekStartDate) {
        // Prefer the concrete persisted date (correct across multi-week/deadline plans); fall back to
        // the legacy weekStartDate + dayOfWeek derivation for rows created before slot_date existed.
        LocalDate slotDate = slot.getSlotDate();
        if (slotDate == null && weekStartDate != null && slot.getDayOfWeek() != null) {
            slotDate = weekStartDate.plusDays(slot.getDayOfWeek());
        }
        
        LocalDate today = LocalDate.now();
        String status = "pending";
        if (Boolean.TRUE.equals(slot.getIsCompleted())) {
            status = "completed";
        } else if (slotDate != null && slotDate.isBefore(today)) {
            status = "missed";
        }

        Integer durationMinutes = null;
        if (slot.getStartTime() != null && slot.getEndTime() != null) {
            durationMinutes = (int) ChronoUnit.MINUTES.between(slot.getStartTime(), slot.getEndTime());
        }

        String notes = slot.getNotes();
        boolean isCatchUp = false;
        LocalDate missedDate = null;
        if (notes != null) {
            String lowerNotes = notes.toLowerCase();
            if (lowerNotes.contains("rescheduled from") || lowerNotes.contains("missed session caught up") || lowerNotes.contains("catch-up")) {
                isCatchUp = true;
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d{4}-\\d{2}-\\d{2})").matcher(notes);
                if (m.find()) {
                    try {
                        missedDate = LocalDate.parse(m.group(1));
                    } catch (Exception ignored) {}
                }
            }
        }

        // Topic metadata from MaterialTopicReader
        UUID studentId = (slot.getTimetable() != null && slot.getTimetable().getStudent() != null)
                ? slot.getTimetable().getStudent().getId()
                : (slot.getSubject() != null && slot.getSubject().getStudent() != null ? slot.getSubject().getStudent().getId() : null);
        UUID subjectId = slot.getSubject() != null ? slot.getSubject().getId() : null;
        String subjectName = slot.getSubject() != null ? slot.getSubject().getSubjectName() : null;

        MaterialTopicReader.TopicDetail topicDetail = materialTopicReader.resolveTopicDetail(
                studentId, subjectId, slot.getTopic(), subjectName);

        // Find nearest upcoming exam for this subject if available
        LocalDate examDeadline = null;
        String examName = null;
        Long daysUntilExam = null;
        if (studentId != null && subjectId != null) {
            List<Exam> exams = examRepository.findUpcomingExams(studentId, today);
            if (exams != null) {
                for (Exam exam : exams) {
                    if (exam.getSubject() != null && exam.getSubject().getId().equals(subjectId) && exam.getExamDate() != null) {
                        examDeadline = exam.getExamDate();
                        examName = exam.getExamName();
                        daysUntilExam = slotDate != null
                                ? ChronoUnit.DAYS.between(slotDate, examDeadline)
                                : ChronoUnit.DAYS.between(today, examDeadline);
                        break;
                    }
                }
            }
        }

        // Reason for selection
        String selectionReason;
        if (isCatchUp) {
            selectionReason = "🔴 Overdue Catch-up: Missed session from " + (missedDate != null ? missedDate : "previous date")
                    + " carried forward to stay on schedule before exams.";
        } else if (slot.getTopic() != null && slot.getTopic().startsWith("Final revision:")) {
            selectionReason = "Final dedicated revision on the eve of your " + (examName != null ? examName : "upcoming") + " exam.";
        } else if (slot.getTopic() != null && slot.getTopic().startsWith("Revision:")) {
            selectionReason = "Spaced repetition revision to reinforce core concepts before the exam.";
        } else if (slot.getTopic() != null && slot.getTopic().startsWith("Practice:")) {
            selectionReason = "Active problem-solving and applied exercises to build speed and accuracy.";
        } else if (slot.getTopic() != null && slot.getTopic().startsWith("Weak-area drill:")) {
            selectionReason = "Targeted drill session focused on strengthening lower-scoring topics.";
        } else if (daysUntilExam != null && daysUntilExam <= 7) {
            selectionReason = "High-priority preparation: upcoming " + (examName != null ? examName : "exam") + " in " + daysUntilExam + " day(s).";
        } else if (topicDetail.getMaterialTitle() != null) {
            selectionReason = "Progressive curriculum sequence from uploaded material: " + topicDetail.getMaterialTitle();
        } else {
            selectionReason = "Standard syllabus allocation based on subject difficulty and available study hours.";
        }

        return SlotResponse.builder()
                .id(slot.getId())
                .subject(StudentMapper.toSubjectResponse(slot.getSubject()))
                .dayOfWeek(slot.getDayOfWeek())
                .date(slotDate)
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .durationMinutes(durationMinutes)
                .topic(slot.getTopic())
                .chapter(topicDetail.getChapter())
                .materialTitle(topicDetail.getMaterialTitle())
                .materialId(topicDetail.getMaterialId())
                .whatToStudy(topicDetail.getWhatToStudy())
                .selectionReason(selectionReason)
                .examDeadline(examDeadline)
                .examName(examName)
                .daysUntilExam(daysUntilExam)
                .difficulty(topicDetail.getDifficulty())
                .difficultyScore(topicDetail.getDifficultyScore())
                .isCompleted(slot.getIsCompleted())
                .status(status)
                .isCatchUp(isCatchUp)
                .missedDate(missedDate)
                .notes(slot.getNotes())
                .build();
    }
}

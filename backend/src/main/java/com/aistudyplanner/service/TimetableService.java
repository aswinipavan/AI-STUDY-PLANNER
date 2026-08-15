package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.dto.request.GenerateTimetableRequest;
import com.aistudyplanner.model.dto.request.SlotRequest;
import com.aistudyplanner.model.dto.request.TimetableRequest;
import com.aistudyplanner.model.dto.response.SlotResponse;
import com.aistudyplanner.model.dto.response.TimetableResponse;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final MaterialRepository materialRepository;
    private final GroqService groqService;

    @Transactional
    public TimetableResponse generateAiTimetable(UUID studentId, GenerateTimetableRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        // Calculate actual study period
        LocalDate startDate = request.getStartDate();
        LocalDate endDate;
        int actualDurationDays;
        
        if (request.getUseDeadlines() != null && request.getUseDeadlines() && request.getTargetDeadlineDate() != null) {
            // Use specific target deadline
            endDate = request.getTargetDeadlineDate();
            actualDurationDays = (int) ChronoUnit.DAYS.between(startDate, endDate);
            if (actualDurationDays < 1) {
                throw new IllegalArgumentException("Target deadline must be after start date");
            }
        } else if (request.getDurationDays() != null) {
            // Use duration from request
            actualDurationDays = request.getDurationDays();
            endDate = startDate.plusDays(actualDurationDays);
        } else {
            // Default to 14 days
            actualDurationDays = 14;
            endDate = startDate.plusDays(actualDurationDays);
        }
        
        log.info("Generating timetable from {} to {} ({} days)", startDate, endDate, actualDurationDays);

        double availableHours = request.getAvailableHoursPerDay().doubleValue();
        List<Subject> allSubjects = subjectRepository.findAllByStudentId(studentId, org.springframework.data.domain.PageRequest.of(0, 100));
        
        if (allSubjects.isEmpty()) {
            throw new IllegalArgumentException("No subjects found. Please add subjects first.");
        }
        
        // FIXED: Filter subjects by the requested subjectIds (was previously ignored)
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
        
        // Calculate subject weights with deadline awareness
        Map<UUID, Double> subjectWeights = calculateSubjectWeights(studentId, subjects, request.getUseDeadlines());
        
        // Deactivate all other timetables
        deactivateExistingTimetables(studentId);
        
        // Create new timetable with start date
        Timetable timetable = createNewTimetable(student, startDate, actualDurationDays);
        
        // Generate slots for actual duration
        List<TimetableSlot> slots = generateTimetableSlotsForDuration(
            timetable, 
            subjects, 
            subjectWeights, 
            availableHours, 
            startDate, 
            actualDurationDays
        );
        timetableSlotRepository.saveAll(slots);
        
        log.info("Generated {} slots for {} days", slots.size(), actualDurationDays);
        
        return getTimetable(studentId);
    }

    /**
     * Calculate weight for each subject based on performance and difficulty
     */
    private Map<UUID, Double> calculateSubjectWeights(UUID studentId, List<Subject> subjects, Boolean useDeadlines) {
        Map<UUID, Double> subjectAverages = new HashMap<>();
        List<Object[]> avgData = marksRepository.findAveragePercentageBySubject(studentId);
        for (Object[] row : avgData) {
            subjectAverages.put((UUID) row[0], ((Number) row[1]).doubleValue());
        }

        // Fetch upcoming exams if deadline mode is enabled
        List<Exam> upcomingExams = new ArrayList<>();
        if (useDeadlines != null && useDeadlines) {
            LocalDate next30Days = LocalDate.now().plusDays(com.aistudyplanner.util.Constants.UPCOMING_EXAMS_WINDOW_DAYS);
            upcomingExams = examRepository.findAllByStudentIdOrderByExamDateAsc(studentId, org.springframework.data.domain.PageRequest.of(0, 100)).stream()
                    .filter(e -> e.getExamDate() != null && !e.getExamDate().isAfter(next30Days) && !e.getExamDate().isBefore(LocalDate.now()))
                    .collect(Collectors.toList());
            log.info("Found {} upcoming exams for deadline-based prioritization", upcomingExams.size());
        }

        Map<UUID, Double> subjectWeights = new HashMap<>();
        for (Subject subject : subjects) {
            double weight = calculateIndividualWeight(subject, subjectAverages, upcomingExams);
            subjectWeights.put(subject.getId(), weight);
            log.debug("Subject {} weight: {}", subject.getSubjectName(), weight);
        }
        return subjectWeights;
    }

    /**
     * Calculate weight for a single subject
     */
    private double calculateIndividualWeight(Subject subject, Map<UUID, Double> subjectAverages, List<Exam> upcomingExams) {
        double avg = subjectAverages.getOrDefault(subject.getId(), 50.0);
        double diffLevel = subject.getDifficultyLevel() != null ? subject.getDifficultyLevel() : com.aistudyplanner.util.Constants.DEFAULT_SUBJECT_DIFFICULTY;
        double weight = (100 - avg) + (diffLevel * 10);
        
        long minDaysToExam = com.aistudyplanner.util.Constants.UPCOMING_EXAMS_WINDOW_DAYS + 1;
        for (Exam exam : upcomingExams) {
            if (exam.getSubject().getId().equals(subject.getId())) {
                long days = ChronoUnit.DAYS.between(LocalDate.now(), exam.getExamDate());
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
     * Generate all timetable slots for the week.
     * FIXED: pre-fetch subject averages once (not per-day).
     */
    private List<TimetableSlot> generateTimetableSlots(Timetable timetable, List<Subject> subjects, 
                                                        Map<UUID, Double> subjectWeights, double availableHours) {
        List<TimetableSlot> slotsToSave = new ArrayList<>();
        double totalWeight = subjectWeights.values().stream().mapToDouble(w -> w != null ? w : 0.0).sum();
        double totalDailyMinutes = availableHours * 60;

        Map<UUID, Integer> allocatedMinutesMap = allocateStudyTime(subjects, subjectWeights, totalWeight, totalDailyMinutes);
        
        // Pre-fetch subject averages ONCE instead of per-day
        Map<UUID, Double> subjectAverages = new HashMap<>();
        List<Object[]> avgData = marksRepository.findAveragePercentageBySubject(timetable.getStudent().getId());
        for (Object[] row : avgData) {
            subjectAverages.put((UUID) row[0], ((Number) row[1]).doubleValue());
        }
        
        for (int dayIndex = 0; dayIndex < com.aistudyplanner.util.Constants.DAYS_PER_WEEK; dayIndex++) {
            slotsToSave.addAll(generateDaySlots(timetable, subjects, allocatedMinutesMap, dayIndex, subjectAverages));
        }
        
        return slotsToSave;
    }
    
    /**
     * Generate timetable slots for actual duration (deadline-based planning).
     * FIXED: pre-fetch subject averages once before the day loop.
     */
    private List<TimetableSlot> generateTimetableSlotsForDuration(
            Timetable timetable, 
            List<Subject> subjects, 
            Map<UUID, Double> subjectWeights, 
            double availableHours,
            LocalDate startDate,
            int durationDays) {
        
        List<TimetableSlot> slotsToSave = new ArrayList<>();
        double totalWeight = subjectWeights.values().stream().mapToDouble(w -> w != null ? w : 0.0).sum();
        double totalDailyMinutes = availableHours * 60;

        Map<UUID, Integer> allocatedMinutesMap = allocateStudyTime(subjects, subjectWeights, totalWeight, totalDailyMinutes);
        
        // FIXED: Pre-fetch subject averages ONCE (was re-queried for every single day)
        Map<UUID, Double> subjectAverages = new HashMap<>();
        List<Object[]> avgData = marksRepository.findAveragePercentageBySubject(timetable.getStudent().getId());
        for (Object[] row : avgData) {
            subjectAverages.put((UUID) row[0], ((Number) row[1]).doubleValue());
        }
        
        // Generate slots for each day in the duration
        for (int dayOffset = 0; dayOffset < durationDays; dayOffset++) {
            LocalDate currentDate = startDate.plusDays(dayOffset);
            // Java DayOfWeek: MONDAY=1 to SUNDAY=7
            // Database expects: 0=Sunday to 6=Saturday
            int dayOfWeek = (currentDate.getDayOfWeek().getValue() % 7); // SUNDAY=0, MONDAY=1, ..., SATURDAY=6
            
            slotsToSave.addAll(generateDaySlotsForDate(timetable, subjects, allocatedMinutesMap, dayOffset, dayOfWeek, subjectAverages));
        }
        
        log.info("Generated {} total slots across {} days", slotsToSave.size(), durationDays);
        return slotsToSave;
    }

    /**
     * Allocate daily study time across subjects
     */
    private Map<UUID, Integer> allocateStudyTime(List<Subject> subjects, Map<UUID, Double> subjectWeights, 
                                                  double totalWeight, double totalDailyMinutes) {
        Map<UUID, Integer> allocatedMinutesMap = new HashMap<>();
        
        for (Subject subject : subjects) {
            double weight = subjectWeights.get(subject.getId());
            double allocated = (weight / totalWeight) * totalDailyMinutes;
            int minutes = Math.max(com.aistudyplanner.util.Constants.MIN_SLOT_DURATION_MINUTES, (int) allocated);
            minutes = Math.round(minutes / (float) com.aistudyplanner.util.Constants.SLOT_DURATION_ROUNDING_MINUTES) * com.aistudyplanner.util.Constants.SLOT_DURATION_ROUNDING_MINUTES;
            if (minutes == 0) minutes = com.aistudyplanner.util.Constants.SLOT_DURATION_ROUNDING_MINUTES;
            allocatedMinutesMap.put(subject.getId(), minutes);
        }
        return allocatedMinutesMap;
    }

    /**
     * Generate slots for a specific day of the week
     */
    /**
     * Generate slots for a specific day of the week.
     * FIXED: subject averages hoisted outside loop, Groq calls wrapped in try-catch.
     */
    private List<TimetableSlot> generateDaySlots(Timetable timetable, List<Subject> subjects,
                                                  Map<UUID, Integer> allocatedMinutesMap, int dayIndex,
                                                  Map<UUID, Double> subjectAverages) {
        List<TimetableSlot> daySlots = new ArrayList<>();
        LocalTime currentTime = LocalTime.of(18, 0);
        boolean isSunday = (dayIndex == 6);
        double dayMultiplier = isSunday ? com.aistudyplanner.util.Constants.DEFAULT_SUNDAY_STUDY_MULTIPLIER : com.aistudyplanner.util.Constants.NORMAL_DAY_STUDY_MULTIPLIER;

        for (Subject subject : subjects) {
            int subjectMinutes = (int) (allocatedMinutesMap.get(subject.getId()) * dayMultiplier);
            if (subjectMinutes <= 0) continue;

            double avg = subjectAverages.getOrDefault(subject.getId(), 50.0);
            
            // Try to get topic from uploaded materials first
            String topicSuggestion = getTopicFromMaterials(
                timetable.getStudent().getId(), 
                subject.getId(), 
                subject.getSubjectName(), 
                avg, 
                subjectMinutes
            );
            
            // Fallback to generic topic generation — FIXED: wrapped in try-catch
            if (topicSuggestion == null) {
                try {
                    topicSuggestion = groqService.generateTopicSuggestion(
                        subject.getSubjectName(), 
                        avg, 
                        subjectMinutes, 
                        com.aistudyplanner.util.Constants.UPCOMING_EXAMS_WINDOW_DAYS
                    );
                } catch (Exception e) {
                    log.warn("Groq topic generation failed for {}, using fallback: {}", subject.getSubjectName(), e.getMessage());
                    topicSuggestion = "Study: " + subject.getSubjectName();
                }
            }

            TimetableSlot slot = TimetableSlot.builder()
                    .timetable(timetable)
                    .subject(subject)
                    .dayOfWeek(dayIndex)
                    .startTime(currentTime)
                    .endTime(currentTime.plusMinutes(subjectMinutes))
                    .topic(topicSuggestion)
                    .isCompleted(false)
                    .build();

            daySlots.add(slot);
            currentTime = currentTime.plusMinutes(subjectMinutes + com.aistudyplanner.util.Constants.BUFFER_BETWEEN_SLOTS_MINUTES);
        }
        return daySlots;
    }
    
    /**
     * Extract topics from uploaded materials for a subject
     * Returns null if no materials available, otherwise returns a material-based topic
     */
    private String getTopicFromMaterials(UUID studentId, UUID subjectId, String subjectName, double avgPercentage, int durationMinutes) {
        List<Material> materials = materialRepository.findAllByStudentIdAndSubjectId(studentId, subjectId);
        
        if (materials.isEmpty()) {
            log.debug("No materials found for subject {}. Using generic topic generation.", subjectName);
            return null;
        }
        
        // Collect all material summaries
        StringBuilder materialContent = new StringBuilder();
        for (Material material : materials) {
            if (material.getAiSummary() != null && !material.getAiSummary().trim().isEmpty()) {
                materialContent.append("Material: ").append(material.getTitle()).append("\n");
                materialContent.append(material.getAiSummary()).append("\n\n");
            }
        }
        
        if (materialContent.length() == 0) {
            log.debug("No material summaries available for subject {}. Using generic topic generation.", subjectName);
            return null;
        }
        
        // Use Groq to extract a specific topic from the material
        try {
            String topic = groqService.extractTopicFromMaterials(
                subjectName, 
                avgPercentage, 
                durationMinutes, 
                materialContent.toString()
            );
            log.info("Generated material-based topic for {}: {}", subjectName, topic);
            return topic;
        } catch (Exception e) {
            log.error("Failed to extract topic from materials for subject {}: {}", subjectName, e.getMessage());
            return null;
        }
    }
    
    /**
     * Generate slots for a specific date in deadline-based planning
     */
    /**
     * Generate slots for a specific date in deadline-based planning.
     * FIXED: Groq calls wrapped in try-catch; subject averages passed in (not re-queried per day).
     */
    private List<TimetableSlot> generateDaySlotsForDate(Timetable timetable, List<Subject> subjects,
                                                        Map<UUID, Integer> allocatedMinutesMap, int dayOffset, int dayOfWeek,
                                                        Map<UUID, Double> subjectAverages) {
        List<TimetableSlot> daySlots = new ArrayList<>();
        LocalTime currentTime = LocalTime.of(18, 0);
        boolean isSunday = (dayOfWeek == 6);
        double dayMultiplier = isSunday ? com.aistudyplanner.util.Constants.DEFAULT_SUNDAY_STUDY_MULTIPLIER : com.aistudyplanner.util.Constants.NORMAL_DAY_STUDY_MULTIPLIER;

        for (Subject subject : subjects) {
            int subjectMinutes = (int) (allocatedMinutesMap.get(subject.getId()) * dayMultiplier);
            if (subjectMinutes <= 0) continue;

            double avg = subjectAverages.getOrDefault(subject.getId(), 50.0);
            
            // Try to get topic from uploaded materials first
            String topicSuggestion = getTopicFromMaterials(
                timetable.getStudent().getId(), 
                subject.getId(), 
                subject.getSubjectName(), 
                avg, 
                subjectMinutes
            );
            
            // Fallback to Groq topic — FIXED: wrapped in try-catch to prevent HTTP 500
            if (topicSuggestion == null) {
                try {
                    topicSuggestion = groqService.generateTopicSuggestion(
                        subject.getSubjectName(), 
                        avg, 
                        subjectMinutes, 
                        com.aistudyplanner.util.Constants.UPCOMING_EXAMS_WINDOW_DAYS
                    );
                } catch (Exception e) {
                    log.warn("Groq topic generation failed for {}, using fallback: {}", subject.getSubjectName(), e.getMessage());
                    topicSuggestion = "Study: " + subject.getSubjectName();
                }
            }

            TimetableSlot slot = TimetableSlot.builder()
                    .timetable(timetable)
                    .subject(subject)
                    .dayOfWeek(dayOfWeek)
                    .startTime(currentTime)
                    .endTime(currentTime.plusMinutes(subjectMinutes))
                    .topic(topicSuggestion)
                    .isCompleted(false)
                    .build();

            daySlots.add(slot);
            currentTime = currentTime.plusMinutes(subjectMinutes + com.aistudyplanner.util.Constants.BUFFER_BETWEEN_SLOTS_MINUTES);
        }
        return daySlots;
    }

    @Transactional(readOnly = true)
    public TimetableResponse getTimetable(UUID studentId) {
        Timetable timetable = timetableRepository.findByStudentIdAndIsActiveTrue(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("No active timetable found"));

        // Use JOIN FETCH to avoid N+1 query problem
        List<TimetableSlot> slots = timetableSlotRepository.findAllByTimetableIdWithSubjectFetch(timetable.getId());
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

        slot.setIsCompleted(!slot.getIsCompleted()); 
        slot = timetableSlotRepository.save(slot);
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
        // Calculate actual date: weekStartDate + dayOfWeek
        LocalDate slotDate = null;
        if (weekStartDate != null && slot.getDayOfWeek() != null) {
            slotDate = weekStartDate.plusDays(slot.getDayOfWeek());
        }
        
        // Map isCompleted to status string
        String status = "pending";
        if (slot.getIsCompleted() != null) {
            status = slot.getIsCompleted() ? "completed" : "pending";
        }
        
        return SlotResponse.builder()
                .id(slot.getId())
                .subject(StudentMapper.toSubjectResponse(slot.getSubject()))
                .dayOfWeek(slot.getDayOfWeek())
                .date(slotDate)
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .topic(slot.getTopic())
                .isCompleted(slot.getIsCompleted())
                .status(status)
                .notes(slot.getNotes())
                .build();
    }
}

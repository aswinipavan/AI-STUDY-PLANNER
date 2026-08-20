package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.response.AcademicReadinessResponse;
import com.aistudyplanner.model.dto.response.AiPerformanceAnalysisResponse;
import com.aistudyplanner.model.dto.response.PerformanceResponse;
import com.aistudyplanner.model.dto.response.SubjectResponse;
import com.aistudyplanner.model.entity.Exam;
import com.aistudyplanner.model.entity.PerformanceSnapshot;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PerformanceService {

    private final MarksRepository marksRepository;
    private final SubjectRepository subjectRepository;
    private final StudentRepository studentRepository;
    private final PerformanceSnapshotRepository snapshotRepository;
    private final ExamRepository examRepository;
    private final MaterialRepository materialRepository;
    private final GroqService groqService;

    @Transactional(readOnly = true)
    public PerformanceResponse getPerformanceReport(UUID studentId) {
        Student student = studentRepository.findById(studentId).orElseThrow();
        
        List<Object[]> avgData = marksRepository.findAveragePercentageBySubject(studentId);
        
        List<SubjectResponse> strongSubjects = new ArrayList<>();
        List<SubjectResponse> needsImprovement = new ArrayList<>();
        List<SubjectResponse> weakSubjects = new ArrayList<>();
        Map<String, Double> subjectWiseMarks = new HashMap<>();
        
        double totalWeightedAvg = 0;
        int subjectCount = 0;

        for (Object[] row : avgData) {
            UUID subId = (UUID) row[0];
            Double avg = ((Number) row[1]).doubleValue();
            
            Subject subject = subjectRepository.findById(subId).orElse(null);
            if (subject != null) {
                SubjectResponse resp = StudentMapper.toSubjectResponseWithAvg(subject, avg);
                subjectWiseMarks.put(subject.getSubjectName(), avg);
                
                totalWeightedAvg += avg;
                subjectCount++;

                if (avg >= 75.0) {
                    strongSubjects.add(resp);
                } else if (avg >= 50.0) {
                    needsImprovement.add(resp);
                } else {
                    weakSubjects.add(resp);
                }
            }
        }

        double overallPercentage = subjectCount > 0 ? (totalWeightedAvg / subjectCount) : 0.0;

        List<String> recommendations = new ArrayList<>();
        for (SubjectResponse weak : weakSubjects) {
            recommendations.add(String.format("Focus more on %s — your average is %.2f%%", 
                    weak.getSubjectName(), weak.getAveragePercentage()));
        }
        
        if (student.getStudyStreak() != null && student.getStudyStreak() < 3) {
            recommendations.add("Try to study daily to build your streak!");
        }
        
        if (overallPercentage > 0 && overallPercentage < 60) {
            recommendations.add("Consider spending at least " + student.getAvailableHoursPerDay() + " hours daily on revision");
        }

        return PerformanceResponse.builder()
                .overallPercentage(overallPercentage)
                .strongSubjects(strongSubjects)
                .weakSubjects(weakSubjects)
                .subjectWiseMarks(subjectWiseMarks)
                .studyStreak(student.getStudyStreak() != null ? student.getStudyStreak() : 0)
                .recommendations(recommendations)
                .build();
    }

    @Transactional(readOnly = true)
    public List<SubjectResponse> getPrioritySubjects(UUID studentId) {
        return getExplainablePrioritySubjects(studentId);
    }

    /**
     * Phase 5: Explainable Study Priority Scoring
     * Calculates transparent multi-signal priority scores (0-100) with explainable reasons.
     */
    @Transactional(readOnly = true)
    public List<SubjectResponse> getExplainablePrioritySubjects(UUID studentId) {
        Student student = studentRepository.findById(studentId).orElseThrow();
        List<Subject> subjects = subjectRepository.findAllByStudentId(studentId);
        if (subjects == null || subjects.isEmpty()) {
            return Collections.emptyList();
        }

        List<Object[]> avgData = marksRepository.findAveragePercentageBySubject(studentId);
        Map<UUID, Double> avgMap = new HashMap<>();
        if (avgData != null) {
            for (Object[] row : avgData) {
                if (row.length >= 2 && row[0] instanceof UUID && row[1] instanceof Number) {
                    avgMap.put((UUID) row[0], ((Number) row[1]).doubleValue());
                }
            }
        }

        List<Exam> upcomingExams = examRepository.findUpcomingExams(studentId, LocalDate.now());
        Map<UUID, Exam> nearestExamMap = new HashMap<>();
        for (Exam exam : upcomingExams) {
            if (exam.getSubject() != null) {
                UUID subId = exam.getSubject().getId();
                if (!nearestExamMap.containsKey(subId) || exam.getExamDate().isBefore(nearestExamMap.get(subId).getExamDate())) {
                    nearestExamMap.put(subId, exam);
                }
            }
        }

        List<SubjectResponse> results = new ArrayList<>();
        for (Subject subject : subjects) {
            Double avg = avgMap.get(subject.getId());
            Exam nextExam = nearestExamMap.get(subject.getId());

            Long daysUntilExam = null;
            LocalDate nextExamDate = null;
            if (nextExam != null) {
                nextExamDate = nextExam.getExamDate();
                daysUntilExam = ChronoUnit.DAYS.between(LocalDate.now(), nextExamDate);
            }

            // Multi-signal Priority Calculation (0 - 100)
            double marksWeight = avg != null ? (100.0 - avg) * 0.45 : 30.0;
            double examUrgency = 0.0;
            if (daysUntilExam != null) {
                if (daysUntilExam <= 3) examUrgency = 35.0;
                else if (daysUntilExam <= 7) examUrgency = 25.0;
                else if (daysUntilExam <= 14) examUrgency = 15.0;
                else if (daysUntilExam <= 30) examUrgency = 5.0;
            }

            int diffLevel = subject.getDifficultyLevel() != null ? subject.getDifficultyLevel() : 3;
            double diffWeight = (diffLevel / 5.0) * 15.0;

            int streak = student.getStudyStreak() != null ? student.getStudyStreak() : 0;
            double consistencyGap = streak < 3 ? 5.0 : 0.0;

            int totalScore = (int) Math.min(100, Math.max(1, Math.round(marksWeight + examUrgency + diffWeight + consistencyGap)));

            String priorityLevel = totalScore >= 70 ? "HIGH" : (totalScore >= 40 ? "MEDIUM" : "LOW");

            List<String> reasons = new ArrayList<>();
            if (avg != null && avg < 60.0) {
                reasons.add(String.format("Low recent marks (%.1f%%)", avg));
            } else if (avg == null) {
                reasons.add("No assessment marks recorded yet");
            }

            if (daysUntilExam != null) {
                if (daysUntilExam <= 7) {
                    reasons.add(String.format("Exam in %d days (%s)", daysUntilExam, nextExam.getExamName() != null ? nextExam.getExamName() : "Upcoming"));
                } else {
                    reasons.add(String.format("Exam scheduled in %d days", daysUntilExam));
                }
            }

            if (diffLevel >= 4) {
                reasons.add(String.format("High subject complexity (Level %d/5)", diffLevel));
            }

            if (streak < 3) {
                reasons.add("Study consistency below target");
            }

            if (reasons.isEmpty()) {
                reasons.add("Routine revision & syllabus maintenance");
            }

            String recommendedStudyTime = totalScore >= 75 ? "2h 30m" : (totalScore >= 50 ? "1h 45m" : "1h 00m");

            SubjectResponse resp = SubjectResponse.builder()
                    .id(subject.getId())
                    .subjectName(subject.getSubjectName())
                    .subjectCode(subject.getSubjectCode())
                    .credits(subject.getCredits())
                    .difficultyLevel(diffLevel)
                    .averagePercentage(avg)
                    .nextExamDate(nextExamDate)
                    .daysUntilExam(daysUntilExam)
                    .priorityScore(totalScore)
                    .priorityLevel(priorityLevel)
                    .reasons(reasons)
                    .recommendedStudyTime(recommendedStudyTime)
                    .build();

            results.add(resp);
        }

        // Sort highest priority score first
        results.sort((a, b) -> Integer.compare(b.getPriorityScore() != null ? b.getPriorityScore() : 0,
                                               a.getPriorityScore() != null ? a.getPriorityScore() : 0));
        return results;
    }

    /**
     * Phase 6: Academic Readiness Composite Metric
     * Calculates overall academic readiness (0-100%) and supporting pillars with AI explanation.
     */
    @Transactional(readOnly = true)
    public AcademicReadinessResponse getAcademicReadiness(UUID studentId) {
        Student student = studentRepository.findById(studentId).orElseThrow();
        List<SubjectResponse> priorities = getExplainablePrioritySubjects(studentId);

        double subjectPerformanceScore = 70.0;
        if (!priorities.isEmpty()) {
            double sumAvg = 0;
            int count = 0;
            for (SubjectResponse s : priorities) {
                if (s.getAveragePercentage() != null) {
                    sumAvg += s.getAveragePercentage();
                    count++;
                }
            }
            if (count > 0) {
                subjectPerformanceScore = Math.min(100.0, Math.max(0.0, sumAvg / count));
            }
        }

        // Exam prep pillar
        List<Exam> upcomingExams = examRepository.findUpcomingExams(studentId, LocalDate.now());
        double examPreparationScore = 80.0;
        if (!upcomingExams.isEmpty()) {
            long minDays = upcomingExams.stream()
                    .mapToLong(e -> ChronoUnit.DAYS.between(LocalDate.now(), e.getExamDate()))
                    .min().orElse(30);
            if (minDays <= 3) examPreparationScore = 60.0;
            else if (minDays <= 7) examPreparationScore = 72.0;
            else examPreparationScore = 85.0;
        }

        // Consistency pillar
        int streak = student.getStudyStreak() != null ? student.getStudyStreak() : 0;
        double studyConsistencyScore = Math.min(100.0, Math.max(30.0, (streak / 7.0) * 50.0 + 50.0));

        // Material coverage pillar
        var materials = materialRepository.findAllByStudentIdOrderByCreatedAtDesc(studentId);
        double materialCoverageScore = Math.min(100.0, Math.max(40.0, (materials.size() * 15.0) + 40.0));

        double overallReadiness = Math.round((subjectPerformanceScore * 0.35) +
                                             (examPreparationScore * 0.25) +
                                             (studyConsistencyScore * 0.20) +
                                             (materialCoverageScore * 0.20));
        overallReadiness = Math.min(100.0, Math.max(10.0, overallReadiness));

        String focusSubject = !priorities.isEmpty() ? priorities.get(0).getSubjectName() : "General Studies";
        String explanation;
        if (overallReadiness >= 80.0) {
            explanation = String.format("Your academic readiness is excellent at %.0f%%. Maintain your study streak and focus on routine revision for %s.", overallReadiness, focusSubject);
        } else if (overallReadiness >= 60.0) {
            explanation = String.format("Your readiness is %.0f%%. Your biggest improvement opportunity is %s where targeted problem-solving and exam practice will yield the highest gains.", overallReadiness, focusSubject);
        } else {
            explanation = String.format("Your readiness is %.0f%%. Immediate focus is recommended on %s to improve baseline marks and prepare for upcoming exams.", overallReadiness, focusSubject);
        }

        return AcademicReadinessResponse.builder()
                .overallReadiness(overallReadiness)
                .subjectPerformanceScore(Math.round(subjectPerformanceScore * 10.0) / 10.0)
                .examPreparationScore(Math.round(examPreparationScore * 10.0) / 10.0)
                .studyConsistencyScore(Math.round(studyConsistencyScore * 10.0) / 10.0)
                .materialCoverageScore(Math.round(materialCoverageScore * 10.0) / 10.0)
                .aiExplanation(explanation)
                .primaryFocusSubject(focusSubject)
                .build();
    }

    /**
     * Phase 4: AI Performance Analysis
     * Generates deep diagnostic academic performance analysis.
     */
    @Transactional(readOnly = true)
    public AiPerformanceAnalysisResponse getAiPerformanceAnalysis(UUID studentId) {
        PerformanceResponse report = getPerformanceReport(studentId);
        List<SubjectResponse> priorities = getExplainablePrioritySubjects(studentId);

        List<String> weakAreas = new ArrayList<>();
        List<String> strongAreas = new ArrayList<>();
        for (SubjectResponse s : report.getWeakSubjects()) {
            weakAreas.add(String.format("%s (%.1f%% average)", s.getSubjectName(), s.getAveragePercentage()));
        }
        for (SubjectResponse s : report.getStrongSubjects()) {
            strongAreas.add(String.format("%s (%.1f%% average)", s.getSubjectName(), s.getAveragePercentage()));
        }

        double perf = report.getOverallPercentage() != null ? report.getOverallPercentage() : 0.0;
        String grade = perf >= 85 ? "A (Distinction)" : (perf >= 70 ? "B (Proficient)" : (perf >= 50 ? "C (Passing)" : "D (Needs Focus)"));

        List<Exam> upcoming = examRepository.findUpcomingExams(studentId, LocalDate.now());
        String examUrgency = upcoming.isEmpty() ? "No exams scheduled within the next 30 days." :
                String.format("%d upcoming exams detected. Nearest is %s in %d days.",
                        upcoming.size(),
                        upcoming.get(0).getExamName() != null ? upcoming.get(0).getExamName() : "Exam",
                        ChronoUnit.DAYS.between(LocalDate.now(), upcoming.get(0).getExamDate()));

        List<String> recommendedTopics = new ArrayList<>();
        if (!priorities.isEmpty()) {
            for (int i = 0; i < Math.min(3, priorities.size()); i++) {
                SubjectResponse p = priorities.get(i);
                recommendedTopics.add(String.format("%s: High priority revision (%s)", p.getSubjectName(), p.getRecommendedStudyTime()));
            }
        }

        String summary = String.format("Performance analysis indicates an overall average of %.1f%% (%s). %s",
                perf, grade, weakAreas.isEmpty() ? "Strong performance across all subjects." :
                        "Prioritize " + weakAreas.get(0) + " to balance academic readiness.");

        return AiPerformanceAnalysisResponse.builder()
                .currentPerformance(perf)
                .performanceGrade(grade)
                .weakAreas(weakAreas)
                .strongAreas(strongAreas)
                .performanceTrend(perf >= 60 ? "Positive / Upward" : "Requires Attention")
                .examUrgency(examUrgency)
                .recommendedTopics(recommendedTopics)
                .recommendedStudyDuration(priorities.isEmpty() ? "2 hours/day" : priorities.get(0).getRecommendedStudyTime())
                .aiDetailedSummary(summary)
                .build();
    }

    @Scheduled(cron = "0 0 20 * * SUN")
    @Transactional
    public void saveWeeklySnapshots() {
        List<Student> students = studentRepository.findAll();
        for (Student student : students) {
            saveWeeklySnapshot(student.getId());
        }
    }

    @Transactional
    public void saveWeeklySnapshot(UUID studentId) {
        PerformanceResponse report = getPerformanceReport(studentId);
        Student student = studentRepository.findById(studentId).orElseThrow();

        PerformanceSnapshot snapshot = PerformanceSnapshot.builder()
                .student(student)
                .snapshotDate(LocalDate.now())
                .overallPercentage(BigDecimal.valueOf(report.getOverallPercentage()))
                .studyHoursWeek(BigDecimal.valueOf((report.getStudyStreak() != null ? report.getStudyStreak() : 0) * student.getAvailableHoursPerDay().doubleValue()))
                .tasksCompleted(0) 
                .aiRecommendations(String.join(" | ", report.getRecommendations()))
                .build();

        snapshotRepository.save(snapshot);
    }

    @Transactional(readOnly = true)
    public List<PerformanceSnapshot> getHistoricalSnapshots(UUID studentId) {
        return snapshotRepository.findAllByStudentIdOrderBySnapshotDateDesc(studentId).stream()
                .limit(12)
                .collect(Collectors.toList());
    }
}


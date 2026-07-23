package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.response.PerformanceResponse;
import com.aistudyplanner.model.dto.response.SubjectResponse;
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
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PerformanceService {

    private final MarksRepository marksRepository;
    private final SubjectRepository subjectRepository;
    private final StudentRepository studentRepository;
    private final PerformanceSnapshotRepository snapshotRepository;

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
        
        // Optional: you can query completedTasksThisWeek later

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

    @Transactional(readOnly = true)
    public List<SubjectResponse> getPrioritySubjects(UUID studentId) {
        List<Object[]> avgData = marksRepository.findAveragePercentageBySubject(studentId);
        
        return avgData.stream()
                .sorted(Comparator.comparingDouble(a -> ((Number) a[1]).doubleValue()))
                .map(row -> {
                    UUID subId = (UUID) row[0];
                    Double avg = ((Number) row[1]).doubleValue();
                    return subjectRepository.findById(subId)
                            .map(s -> StudentMapper.toSubjectResponseWithAvg(s, avg))
                            .orElse(null);
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
}

package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectResponse {

    private UUID id;
    private String subjectName;
    private String subjectCode;
    private Integer credits;
    private Integer difficultyLevel;
    private Double averagePercentage;
    private LocalDate nextExamDate; // Nearest upcoming exam for this subject
    private Long daysUntilExam; // Calculated remaining days
    private Integer priorityScore; // 0 - 100
    private String priorityLevel; // HIGH, MEDIUM, LOW
    private java.util.List<String> reasons; // Explainable priority reasoning
    private String recommendedStudyTime; // e.g. "2h 30m"
}

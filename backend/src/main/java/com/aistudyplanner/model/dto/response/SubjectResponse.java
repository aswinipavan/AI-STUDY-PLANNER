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
}

package com.aistudyplanner.model.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademicReadinessResponse {

    private Double overallReadiness;
    private Double subjectPerformanceScore;
    private Double examPreparationScore;
    private Double studyConsistencyScore;
    private Double materialCoverageScore;
    private String aiExplanation;
    private String primaryFocusSubject;
}

package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiPerformanceAnalysisResponse {

    private Double currentPerformance;
    private String performanceGrade;
    private List<String> weakAreas;
    private List<String> strongAreas;
    private String performanceTrend;
    private String examUrgency;
    private List<String> recommendedTopics;
    private String recommendedStudyDuration;
    private String aiDetailedSummary;
}

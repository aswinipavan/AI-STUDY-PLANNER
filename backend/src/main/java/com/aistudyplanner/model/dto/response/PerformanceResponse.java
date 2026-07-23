package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceResponse {

    private Double overallPercentage;
    private List<SubjectResponse> strongSubjects;
    private List<SubjectResponse> weakSubjects;
    private Map<String, Double> subjectWiseMarks;
    private Integer studyStreak;
    private List<String> recommendations;
}

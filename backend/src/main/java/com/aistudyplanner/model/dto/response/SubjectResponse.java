package com.aistudyplanner.model.dto.response;

import lombok.*;

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
}

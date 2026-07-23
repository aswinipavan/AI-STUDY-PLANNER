package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamResponse {

    private UUID id;
    private SubjectResponse subject;
    private String examName;
    private LocalDate examDate;
    private String examType;
    private String syllabusCovered;
    private long daysRemaining;
    private Boolean isCompleted;
}

package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotResponse {

    private UUID id;
    private SubjectResponse subject;
    private Integer dayOfWeek;
    private LocalDate date;  // actual date for the slot
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer durationMinutes;
    private String topic;
    private String chapter;
    private String materialTitle;
    private UUID materialId;
    private List<String> whatToStudy;
    private String selectionReason;
    private LocalDate examDeadline;
    private String examName;
    private Long daysUntilExam;
    private String difficulty;
    private Integer difficultyScore;
    private Boolean isCompleted;
    private String status;  // 'pending', 'completed', 'missed', or 'skipped'
    private Boolean isCatchUp;
    private LocalDate missedDate;
    private String notes;
    private Boolean hasEvidence;
    private String evidenceStatus;
    private Integer evidenceScore;
    private UUID evidenceId;
}


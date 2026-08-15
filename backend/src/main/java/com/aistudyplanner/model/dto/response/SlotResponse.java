package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotResponse {

    private UUID id;
    private SubjectResponse subject;
    private Integer dayOfWeek;
    private LocalDate date;  // Added: actual date for the slot
    private LocalTime startTime;
    private LocalTime endTime;
    private String topic;
    private Boolean isCompleted;
    private String status;  // Added: 'pending', 'completed', or 'skipped'
    private String notes;
}

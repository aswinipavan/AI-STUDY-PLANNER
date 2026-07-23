package com.aistudyplanner.model.dto.response;

import lombok.*;

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
    private LocalTime startTime;
    private LocalTime endTime;
    private String topic;
    private Boolean isCompleted;
    private String notes;
}

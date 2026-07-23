package com.aistudyplanner.model.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SlotRequest {

    @NotNull(message = "Subject ID must not be null")
    private UUID subjectId;

    @NotNull @Min(0) @Max(6)
    private Integer dayOfWeek;

    @NotNull(message = "Start time must not be null")
    private LocalTime startTime;

    @NotNull(message = "End time must not be null")
    private LocalTime endTime;

    private String topic;
}

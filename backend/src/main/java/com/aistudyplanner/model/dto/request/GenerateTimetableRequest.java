package com.aistudyplanner.model.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GenerateTimetableRequest {

    @NotEmpty(message = "At least one subject must be provided")
    private List<UUID> subjectIds;

    @NotNull(message = "Available hours per day must not be null")
    @Min(value = 1, message = "Available hours per day must be at least 1")
    @Max(value = 24, message = "Available hours per day cannot exceed 24")
    private Integer availableHoursPerDay;

    @NotNull(message = "Style must not be null")
    @Pattern(regexp = "intense|balanced|relaxed", message = "Style must be one of: intense, balanced, relaxed")
    private String style;

    @NotNull(message = "Start date must not be null")
    private LocalDate startDate;

    @NotNull(message = "Duration days must not be null")
    @Min(value = 1, message = "Duration must be at least 1 day")
    @Max(value = 365, message = "Duration cannot exceed 365 days")
    private Integer durationDays;

    private Boolean useDeadlines;

    private LocalDate targetDeadlineDate;
}

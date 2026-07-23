package com.aistudyplanner.model.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TimetableRequest {

    @NotNull(message = "Week start date must not be null")
    private LocalDate weekStartDate;

    private String title;

    @NotEmpty(message = "At least one slot must be provided")
    @Valid
    private List<SlotRequest> slots;
}

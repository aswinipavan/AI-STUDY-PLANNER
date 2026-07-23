package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableResponse {

    private UUID id;
    private String title;
    private LocalDate weekStartDate;
    private Boolean isAiGenerated;
    private Boolean isActive;
    private List<SlotResponse> slots;
    private OffsetDateTime createdAt;
}

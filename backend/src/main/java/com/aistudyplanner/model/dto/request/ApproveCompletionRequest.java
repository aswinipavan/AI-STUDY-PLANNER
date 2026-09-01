package com.aistudyplanner.model.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveCompletionRequest {

    @NotNull(message = "evidenceId is required")
    private UUID evidenceId;
}

package com.aistudyplanner.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyRoomMessageRequest {

    @NotBlank(message = "Message content is required")
    private String message;

    @Builder.Default
    private Boolean isAi = false;
}

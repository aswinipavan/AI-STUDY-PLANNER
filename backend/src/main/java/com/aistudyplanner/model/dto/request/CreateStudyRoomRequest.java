package com.aistudyplanner.model.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStudyRoomRequest {

    private UUID subjectId;
    private String subjectName;
    private String topic;

    @Min(value = 10, message = "Duration must be at least 10 minutes")
    @Max(value = 240, message = "Duration cannot exceed 240 minutes")
    @Builder.Default
    private Integer durationMinutes = 50;

    @Min(value = 2, message = "Maximum participants must be at least 2")
    @Max(value = 20, message = "Maximum participants cannot exceed 20")
    @Builder.Default
    private Integer maxParticipants = 4;
}

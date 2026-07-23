package com.aistudyplanner.model.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExamRequest {

    @NotNull(message = "Subject ID must not be null")
    private UUID subjectId;

    @NotBlank(message = "Exam name must not be blank")
    private String examName;

    @NotNull(message = "Exam date must not be null")
    private LocalDate examDate;

    private String examType;

    @DecimalMin("0.5")
    private BigDecimal durationHours;

    private String syllabusCovered;
}

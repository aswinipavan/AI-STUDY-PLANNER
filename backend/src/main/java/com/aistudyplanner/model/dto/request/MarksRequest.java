package com.aistudyplanner.model.dto.request;

import com.aistudyplanner.model.ExamType;
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
public class MarksRequest {

    @NotNull(message = "Subject ID must not be null")
    private UUID subjectId;

    @NotNull(message = "Exam type must not be null")
    private ExamType examType;

    @NotNull @DecimalMin("0.0")
    private BigDecimal marksObtained;

    @NotNull @DecimalMin("1.0")
    private BigDecimal totalMarks;

    private LocalDate examDate;
}

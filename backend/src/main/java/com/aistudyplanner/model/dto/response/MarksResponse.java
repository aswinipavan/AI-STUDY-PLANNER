package com.aistudyplanner.model.dto.response;

import com.aistudyplanner.model.ExamType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarksResponse {

    private UUID id;
    private SubjectResponse subject;
    private ExamType examType;
    private BigDecimal marksObtained;
    private BigDecimal totalMarks;
    private BigDecimal percentage;
    private LocalDate examDate;
}

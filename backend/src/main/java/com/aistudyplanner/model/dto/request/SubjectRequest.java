package com.aistudyplanner.model.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SubjectRequest {

    @NotBlank(message = "Subject name must not be blank")
    private String subjectName;

    private String subjectCode;

    @Min(value = 1, message = "Credits must be at least 1")
    private Integer credits;

    @Min(1) @Max(5)
    private Integer difficultyLevel;

    private Integer semester;
}

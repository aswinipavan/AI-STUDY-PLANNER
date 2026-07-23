package com.aistudyplanner.model.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateProfileRequest {

    private String fullName;
    private String email;
    private String collegeName;
    private Integer semester;
    private String department;
    private BigDecimal availableHoursPerDay;
}

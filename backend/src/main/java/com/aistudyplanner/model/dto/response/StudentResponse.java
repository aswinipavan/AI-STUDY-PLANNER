package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentResponse {

    private UUID id;
    private String firebaseUid;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String collegeName;
    private Integer semester;
    private String department;
    private Boolean isPremium;
    private Integer studyStreak;
    private BigDecimal availableHoursPerDay;
    private String profilePictureUrl;
}

package com.aistudyplanner.model.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private StudentResponse student;
    private boolean isNewUser;
}

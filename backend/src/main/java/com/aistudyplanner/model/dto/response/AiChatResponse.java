package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {

    private String reply;      // AI response text
    private String sessionId;
    private OffsetDateTime timestamp;
}

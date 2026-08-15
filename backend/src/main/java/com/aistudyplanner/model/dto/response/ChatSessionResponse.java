package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatSessionResponse {
    private String sessionId;
    private String title;  // First message content (truncated)
    private OffsetDateTime createdAt;
    private String lastMessage;  // Last message content (truncated)
    private OffsetDateTime lastMessageAt;
}

package com.aistudyplanner.model.dto.response;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO for chat history responses.
 * CRITICAL FIX: Previously the controller returned raw ChatHistory entities
 * which have a lazy-loaded Student field → LazyInitializationException → HTTP 500.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private UUID id;
    private String role;
    private String message;
    private String sessionId;
    private OffsetDateTime createdAt;
}

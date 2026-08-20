package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyRoomMessageResponse {

    private UUID id;
    private UUID senderId;
    private String senderName;
    private String message;
    private Boolean isAi;
    private OffsetDateTime createdAt;
}

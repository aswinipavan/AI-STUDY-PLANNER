package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyRoomParticipantResponse {

    private UUID id;
    private UUID studentId;
    private String studentName;
    private String avatarUrl;
    private Boolean isOwner;
    private OffsetDateTime joinedAt;
}

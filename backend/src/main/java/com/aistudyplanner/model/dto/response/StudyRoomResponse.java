package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyRoomResponse {

    private UUID id;
    private String roomCode;
    private UUID ownerId;
    private String ownerName;
    private UUID subjectId;
    private String subjectName;
    private String topic;
    private Integer durationMinutes;
    private Integer maxParticipants;
    private Integer currentParticipantsCount;
    private String status;
    private OffsetDateTime createdAt;
    private OffsetDateTime expiresAt;
    private Long secondsRemaining;
    private List<StudyRoomParticipantResponse> participants;
    private List<StudyRoomMessageResponse> recentMessages;
}

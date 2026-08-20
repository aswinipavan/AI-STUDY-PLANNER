package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private String id;
    private String type; // EXAM_ALERT, DAILY_REMINDER, LOW_PERFORMANCE, STREAK_ALERT, STUDY_ROOM
    private String title;
    private String message;
    private String priority; // HIGH, MEDIUM, LOW
    private String actionUrl;
    private OffsetDateTime createdAt;
    private Boolean isRead;
}

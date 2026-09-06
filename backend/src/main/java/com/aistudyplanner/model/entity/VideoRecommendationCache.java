package com.aistudyplanner.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "timetable_video_recommendations_cache", indexes = {
        @Index(name = "idx_video_rec_cache_key", columnList = "cache_key", unique = true),
        @Index(name = "idx_video_rec_expires", columnList = "expires_at"),
        @Index(name = "idx_video_rec_slot", columnList = "timetable_slot_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoRecommendationCache {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "cache_key", length = 128, nullable = false, unique = true)
    private String cacheKey;

    @Column(name = "student_id")
    private UUID studentId;

    @Column(name = "timetable_slot_id")
    private UUID timetableSlotId;

    @Column(name = "topic", length = 300, nullable = false)
    private String topic;

    @Column(name = "chapter", length = 300)
    private String chapter;

    @Column(name = "subject_name", length = 200)
    private String subjectName;

    @Column(name = "recommendations_json", columnDefinition = "TEXT", nullable = false)
    private String recommendationsJson;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;
}

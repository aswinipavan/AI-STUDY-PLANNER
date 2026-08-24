package com.aistudyplanner.model.entity;

import com.aistudyplanner.model.MaterialType;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "materials")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    @ToString.Exclude
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")  // nullable
    @ToString.Exclude
    private Subject subject;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_url", columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "file_type", length = 50)
    private String fileType;

    @Enumerated(EnumType.STRING)
    @Column(name = "material_type", length = 50)
    private MaterialType materialType;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;

    @Column(name = "ai_categorized_subject", length = 100)
    private String aiCategorizedSubject;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", length = 30)
    private com.aistudyplanner.model.ProcessingStatus processingStatus;

    @Column(name = "extracted_topics", columnDefinition = "TEXT")
    private String extractedTopics;

    @Column(name = "extracted_chapters", columnDefinition = "TEXT")
    private String extractedChapters;

    @Column(name = "extracted_keywords", columnDefinition = "TEXT")
    private String extractedKeywords;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Column(name = "overall_difficulty", length = 20)
    private String overallDifficulty;

    @Column(name = "difficulty_score")
    private Integer difficultyScore;

    @Column(name = "difficulty_reason", columnDefinition = "TEXT")
    private String difficultyReason;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (processingStatus == null) {
            processingStatus = com.aistudyplanner.model.ProcessingStatus.PENDING;
        }
    }
}

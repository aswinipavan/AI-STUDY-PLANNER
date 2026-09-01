package com.aistudyplanner.model.entity;

import com.aistudyplanner.model.VerificationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "study_evidence_submissions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyEvidenceSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timetable_slot_id", nullable = false)
    @ToString.Exclude
    private TimetableSlot timetableSlot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    @ToString.Exclude
    private Student student;

    @Column(name = "file_name", length = 255, nullable = false)
    private String fileName;

    @Column(name = "file_url", columnDefinition = "TEXT", nullable = false)
    private String fileUrl;

    @Column(name = "file_type", length = 100)
    private String fileType;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 30, nullable = false)
    private VerificationStatus verificationStatus;

    @Column(name = "score")
    private Integer score; // 0 to 100

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "matched_topics", columnDefinition = "TEXT")
    private String matchedTopics; // JSON array or formatted list

    @Column(name = "missing_topics", columnDefinition = "TEXT")
    private String missingTopics; // JSON array or formatted list

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "confidence")
    private Integer confidence; // 0 to 100

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    @Builder.Default
    @Column(name = "is_used_for_completion")
    private Boolean isUsedForCompletion = false;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    private OffsetDateTime submittedAt;
}

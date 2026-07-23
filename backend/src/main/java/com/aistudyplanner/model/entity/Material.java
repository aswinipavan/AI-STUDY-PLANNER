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

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}

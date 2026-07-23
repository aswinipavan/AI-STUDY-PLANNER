package com.aistudyplanner.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "exams", indexes = {
    @Index(name = "idx_exam_student_date", columnList = "student_id,exam_date"),
    @Index(name = "idx_exam_date", columnList = "exam_date")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    @ToString.Exclude
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    @ToString.Exclude
    private Subject subject;

    @Column(name = "exam_name", length = 100)
    private String examName;

    @Column(name = "exam_date", nullable = false)
    private LocalDate examDate;

    @Column(name = "exam_type", length = 50)
    private String examType;

    @Column(name = "duration_hours", precision = 4, scale = 1)
    private BigDecimal durationHours;

    @Column(name = "syllabus_covered", columnDefinition = "TEXT")
    private String syllabusCovered;

    @Builder.Default
    @Column(name = "is_completed")
    private Boolean isCompleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}

package com.aistudyplanner.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "slot_revisions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotRevision {

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

    @Column(name = "topic", length = 200, nullable = false)
    private String topic;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "key_concepts", columnDefinition = "TEXT")
    private String keyConcepts; // JSON array of strings

    @Column(name = "important_formulas", columnDefinition = "TEXT")
    private String importantFormulas; // JSON array of FormulaItem

    @Column(name = "quiz_questions", columnDefinition = "TEXT")
    private String quizQuestions; // JSON array of QuizQuestion

    @Column(name = "weak_areas", columnDefinition = "TEXT")
    private String weakAreas; // JSON array of strings

    @Column(name = "quick_revision_points", columnDefinition = "TEXT")
    private String quickRevisionPoints; // JSON array of strings

    @Column(name = "score")
    private Integer score; // 0 to 100

    @Builder.Default
    @Column(name = "is_completed")
    private Boolean isCompleted = false;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}

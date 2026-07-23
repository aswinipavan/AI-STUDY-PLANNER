package com.aistudyplanner.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "performance_snapshots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    @ToString.Exclude
    private Student student;

    @Column(name = "snapshot_date")
    private LocalDate snapshotDate;

    @Column(name = "overall_percentage", precision = 5, scale = 2)
    private BigDecimal overallPercentage;

    @Column(name = "study_hours_week", precision = 5, scale = 1)
    private BigDecimal studyHoursWeek;

    @Column(name = "tasks_completed")
    private Integer tasksCompleted;

    @Column(name = "ai_recommendations", columnDefinition = "TEXT")
    private String aiRecommendations;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}

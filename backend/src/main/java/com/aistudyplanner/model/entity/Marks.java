package com.aistudyplanner.model.entity;

import com.aistudyplanner.model.ExamType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "marks", indexes = {
    @Index(name = "idx_marks_student", columnList = "student_id"),
    @Index(name = "idx_marks_subject", columnList = "subject_id"),
    @Index(name = "idx_marks_student_subject", columnList = "student_id,subject_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Marks {

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

    @Enumerated(EnumType.STRING)
    @Column(name = "exam_type", length = 50)
    private ExamType examType;

    @Column(name = "marks_obtained", precision = 6, scale = 2)
    private BigDecimal marksObtained;

    @Column(name = "total_marks", precision = 6, scale = 2)
    private BigDecimal totalMarks;

    @Column(name = "percentage", precision = 5, scale = 2)
    private BigDecimal percentage;

    @Column(name = "exam_date")
    private LocalDate examDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    @PreUpdate
    public void calculatePercentage() {
        if (marksObtained != null && totalMarks != null
                && totalMarks.compareTo(BigDecimal.ZERO) > 0) {
            this.percentage = marksObtained
                    .divide(totalMarks, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }
    }
}

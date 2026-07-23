package com.aistudyplanner.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "subjects")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    @ToString.Exclude
    private Student student;

    @Column(name = "subject_name", nullable = false, length = 100)
    private String subjectName;

    @Column(name = "subject_code", length = 20)
    private String subjectCode;

    @Column(name = "credits")
    private Integer credits;

    @Builder.Default
    @Column(name = "difficulty_level")
    private Integer difficultyLevel = 3;

    @Column(name = "semester")
    private Integer semester;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    // Relationships
    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private List<Marks> marks = new ArrayList<>();

    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private List<TimetableSlot> timetableSlots = new ArrayList<>();

    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private List<Exam> exams = new ArrayList<>();

    @OneToMany(mappedBy = "subject", fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private List<Material> materials = new ArrayList<>();
}

package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExamRepository extends JpaRepository<Exam, UUID> {

    org.springframework.data.domain.Page<Exam> findAllByStudentIdOrderByExamDateAsc(UUID studentId, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT e FROM Exam e WHERE e.student.id = :studentId " +
           "AND e.examDate >= :today AND e.isCompleted = false " +
           "ORDER BY e.examDate ASC")
    List<Exam> findUpcomingExams(@Param("studentId") UUID studentId,
                                 @Param("today") LocalDate today);

    List<Exam> findAllByStudentIdAndIsCompleted(UUID studentId, boolean isCompleted);
}

package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.Marks;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MarksRepository extends JpaRepository<Marks, UUID> {

    List<Marks> findAllByStudentId(UUID studentId);

    List<Marks> findAllByStudentIdAndSubjectId(UUID studentId, UUID subjectId);

    List<Marks> findAllByStudentIdOrderByExamDateDesc(UUID studentId);

    Page<Marks> findAllByStudentIdOrderByExamDateDesc(UUID studentId, Pageable pageable);

    Page<Marks> findAllByStudentIdAndSubjectIdOrderByExamDateDesc(UUID studentId, UUID subjectId, Pageable pageable);

    @Query("SELECT m.subject.id, AVG(m.percentage) FROM Marks m " +
           "WHERE m.student.id = :studentId " +
           "GROUP BY m.subject.id")
    List<Object[]> findAveragePercentageBySubject(@Param("studentId") UUID studentId);
}


package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, UUID> {

    Optional<Timetable> findByStudentIdAndIsActive(UUID studentId, boolean isActive);

    Optional<Timetable> findByStudentIdAndIsActiveTrue(UUID studentId);

    List<Timetable> findAllByStudentId(UUID studentId);

    List<Timetable> findAllByStudentIdOrderByCreatedAtDesc(UUID studentId);

    @Query("SELECT t FROM Timetable t LEFT JOIN FETCH t.slots s WHERE t.student.id = :studentId ORDER BY t.createdAt DESC")
    List<Timetable> findAllByStudentIdWithSlots(@Param("studentId") UUID studentId);
}


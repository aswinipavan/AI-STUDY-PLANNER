package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.SlotRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SlotRevisionRepository extends JpaRepository<SlotRevision, UUID> {

    Optional<SlotRevision> findByTimetableSlotIdAndStudentId(UUID timetableSlotId, UUID studentId);

    boolean existsByTimetableSlotIdAndStudentId(UUID timetableSlotId, UUID studentId);

    void deleteAllByTimetableSlotId(UUID timetableSlotId);
}

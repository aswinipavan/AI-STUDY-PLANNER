package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.StudyEvidenceSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudyEvidenceSubmissionRepository extends JpaRepository<StudyEvidenceSubmission, UUID> {

    Optional<StudyEvidenceSubmission> findTopByTimetableSlotIdAndStudentIdOrderBySubmittedAtDesc(UUID timetableSlotId, UUID studentId);

    List<StudyEvidenceSubmission> findAllByTimetableSlotIdOrderBySubmittedAtDesc(UUID timetableSlotId);

    Optional<StudyEvidenceSubmission> findByIdAndStudentId(UUID id, UUID studentId);
}

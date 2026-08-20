package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.StudyRoomParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudyRoomParticipantRepository extends JpaRepository<StudyRoomParticipant, UUID> {

    List<StudyRoomParticipant> findAllByRoomIdOrderByJoinedAtAsc(UUID roomId);

    Optional<StudyRoomParticipant> findByRoomIdAndStudentId(UUID roomId, UUID studentId);

    long countByRoomId(UUID roomId);

    void deleteByRoomIdAndStudentId(UUID roomId, UUID studentId);
}

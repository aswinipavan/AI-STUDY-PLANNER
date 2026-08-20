package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.StudyRoomMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StudyRoomMessageRepository extends JpaRepository<StudyRoomMessage, UUID> {

    List<StudyRoomMessage> findTop100ByRoomIdOrderByCreatedAtAsc(UUID roomId);
}

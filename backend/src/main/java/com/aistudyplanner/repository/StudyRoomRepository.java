package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.StudyRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudyRoomRepository extends JpaRepository<StudyRoom, UUID> {

    Optional<StudyRoom> findByRoomCodeIgnoreCase(String roomCode);

    List<StudyRoom> findAllByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

    @Query("SELECT r FROM StudyRoom r WHERE r.status = 'ACTIVE' ORDER BY r.createdAt DESC")
    List<StudyRoom> findActiveRooms();

    @Query("SELECT r FROM StudyRoom r JOIN r.participants p WHERE p.student.id = :studentId AND r.status = 'ACTIVE'")
    List<StudyRoom> findActiveRoomsForStudent(@Param("studentId") UUID studentId);
}

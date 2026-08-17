package com.aistudyplanner.repository;

import com.aistudyplanner.model.entity.ChatHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChatHistoryRepository extends JpaRepository<ChatHistory, UUID> {

    List<ChatHistory> findAllByStudentIdAndSessionIdOrderByCreatedAtAsc(UUID studentId, String sessionId);
    Page<ChatHistory> findAllByStudentIdAndSessionIdOrderByCreatedAtAsc(UUID studentId, String sessionId, Pageable pageable);

    // Alias without "All" prefix for service compatibility
    default List<ChatHistory> findByStudentIdAndSessionIdOrderByCreatedAtAsc(UUID studentId, String sessionId) {
        return findAllByStudentIdAndSessionIdOrderByCreatedAtAsc(studentId, sessionId);
    }

    List<ChatHistory> findTop20ByStudentIdOrderByCreatedAtDesc(UUID studentId);

    List<ChatHistory> findTop10ByStudentIdAndSessionIdOrderByCreatedAtDesc(UUID studentId, String sessionId);

    List<ChatHistory> findTop50ByStudentIdAndSessionIdOrderByCreatedAtDesc(UUID studentId, String sessionId);

    // For cleanup: find all messages older than 30 days
    List<ChatHistory> findAllByCreatedAtBefore(OffsetDateTime date);

    // Get distinct sessionIds for a student with metadata
    @Query("SELECT ch.sessionId FROM ChatHistory ch WHERE ch.student.id = :studentId GROUP BY ch.sessionId ORDER BY MAX(ch.createdAt) DESC")
    List<String> findDistinctSessionIdsByStudentId(@org.springframework.data.repository.query.Param("studentId") UUID studentId);

    // Get first message of each session for metadata
    @Query("SELECT ch FROM ChatHistory ch WHERE ch.student.id = :studentId AND ch.id IN (SELECT MIN(ch2.id) FROM ChatHistory ch2 WHERE ch2.student.id = :studentId GROUP BY ch2.sessionId) ORDER BY ch.createdAt DESC")
    List<ChatHistory> findFirstMessagePerSession(@org.springframework.data.repository.query.Param("studentId") UUID studentId);
}


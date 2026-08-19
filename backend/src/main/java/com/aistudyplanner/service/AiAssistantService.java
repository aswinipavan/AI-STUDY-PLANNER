package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.request.ChatRequest;
import com.aistudyplanner.model.dto.response.AiChatResponse;
import com.aistudyplanner.model.dto.response.ChatMessageResponse;
import com.aistudyplanner.model.entity.ChatHistory;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.ChatHistoryRepository;
import com.aistudyplanner.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import com.aistudyplanner.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class AiAssistantService {

    private final ChatHistoryRepository chatHistoryRepository;
    private final GroqService groqService;
    private final StudentRepository studentRepository;
    private final com.aistudyplanner.repository.MaterialRepository materialRepository;

    @Transactional
    public AiChatResponse chat(UUID studentId, ChatRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        // Auto-generate sessionId if not provided
        String sessionId = request.getSessionId();
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = generateNewSessionId();
        }

        ChatHistory userMessage = ChatHistory.builder()
                .student(student)
                .sessionId(sessionId)
                .role("user")
                .message(request.getMessage())
                .build();
        chatHistoryRepository.save(userMessage);

        // Fetch only last 10 messages for context to avoid token limit issues
        List<ChatHistory> history = chatHistoryRepository.findTop10ByStudentIdAndSessionIdOrderByCreatedAtDesc(studentId, sessionId);
        // Reverse to get chronological order
        java.util.Collections.reverse(history);
        
        // Build document context if materialId provided or student has relevant materials
        String documentContext = null;
        if (request.getMaterialId() != null) {
            var materialOpt = materialRepository.findByIdAndStudentId(request.getMaterialId(), studentId);
            if (materialOpt.isPresent()) {
                documentContext = buildDocumentContext(materialOpt.get());
            }
        } else {
            var recentMaterials = materialRepository.findAllByStudentIdOrderByCreatedAtDesc(studentId);
            if (!recentMaterials.isEmpty()) {
                String lowerMsg = request.getMessage().toLowerCase();
                for (var m : recentMaterials) {
                    if (lowerMsg.contains("pdf") || lowerMsg.contains("material") || lowerMsg.contains("document")
                            || lowerMsg.contains("unit") || lowerMsg.contains("chapter") || lowerMsg.contains("notes")
                            || (m.getTitle() != null && lowerMsg.contains(m.getTitle().toLowerCase()))
                            || (m.getFileName() != null && lowerMsg.contains(m.getFileName().toLowerCase()))) {
                        documentContext = buildDocumentContext(m);
                        break;
                    }
                }
            }
        }

        String assistantReply = groqService.chat(request.getMessage(), history, documentContext);

        ChatHistory assistantMessage = ChatHistory.builder()
                .student(student)
                .sessionId(sessionId)
                .role("assistant")
                .message(assistantReply)
                .build();
        chatHistoryRepository.save(assistantMessage);

        return AiChatResponse.builder()
                .sessionId(sessionId)
                .reply(assistantReply)
                .build();
    }

    private String buildDocumentContext(com.aistudyplanner.model.entity.Material m) {
        StringBuilder sb = new StringBuilder();
        sb.append("Document: ").append(m.getTitle() != null ? m.getTitle() : m.getFileName()).append("\n");
        if (m.getSubject() != null) {
            sb.append("Subject: ").append(m.getSubject().getSubjectName()).append("\n");
        }
        if (m.getOverallDifficulty() != null) {
            sb.append("Assessed Complexity: ").append(m.getOverallDifficulty());
            if (m.getDifficultyScore() != null) {
                sb.append(" (Score: ").append(m.getDifficultyScore()).append("/100)");
            }
            sb.append("\n");
        }
        if (m.getDifficultyReason() != null && !m.getDifficultyReason().isBlank()) {
            sb.append("Complexity Insights: ").append(m.getDifficultyReason()).append("\n");
        }
        if (m.getExtractedChapters() != null && !m.getExtractedChapters().isBlank()) {
            sb.append("Extracted Chapters & Units:\n").append(m.getExtractedChapters()).append("\n");
        }
        if (m.getExtractedTopics() != null && !m.getExtractedTopics().isBlank()) {
            sb.append("Extracted Key Topics:\n").append(m.getExtractedTopics()).append("\n");
        }
        if (m.getExtractedKeywords() != null && !m.getExtractedKeywords().isBlank()) {
            sb.append("Key Vocabulary/Keywords:\n").append(m.getExtractedKeywords()).append("\n");
        }
        if (m.getAiSummary() != null && !m.getAiSummary().isBlank()) {
            String summary = m.getAiSummary();
            if (summary.length() > 2000) summary = summary.substring(0, 2000) + "...";
            sb.append("Document Summary:\n").append(summary).append("\n");
        }
        return sb.toString();
    }

    /**
     * Get chat history as DTOs (not raw entities).
     * CRITICAL FIX: Raw ChatHistory entity had lazy-loaded Student → LazyInitializationException → 500.
     * Now maps to ChatMessageResponse DTOs within the transaction.
     */
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getChatHistory(UUID studentId, String sessionId) {
        // Fetch in DESC order, then reverse to chronological (ASC)
        List<ChatHistory> history = chatHistoryRepository.findTop50ByStudentIdAndSessionIdOrderByCreatedAtDesc(studentId, sessionId);
        java.util.Collections.reverse(history); // chronological order
        return history.stream()
                .map(ch -> ChatMessageResponse.builder()
                        .id(ch.getId())
                        .role(ch.getRole())
                        .message(ch.getMessage())
                        .sessionId(ch.getSessionId())
                        .createdAt(ch.getCreatedAt())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.aistudyplanner.model.dto.response.ChatSessionResponse> getChatSessions(UUID studentId) {
        // Get distinct sessions with first and last message per session
        List<String> sessionIds = chatHistoryRepository.findDistinctSessionIdsByStudentId(studentId);
        
        return sessionIds.stream().map(sessionId -> {
            List<ChatHistory> messages = chatHistoryRepository.findTop50ByStudentIdAndSessionIdOrderByCreatedAtDesc(studentId, sessionId);
            if (messages.isEmpty()) {
                return null;
            }
            
            // Messages are in DESC order, so first element is most recent
            ChatHistory lastMessage = messages.get(0);
            ChatHistory firstMessage = messages.get(messages.size() - 1);
            
            String title = firstMessage.getMessage();
            if (title.length() > 50) {
                title = title.substring(0, 50) + "...";
            }
            
            String lastMsg = lastMessage.getMessage();
            if (lastMsg.length() > 100) {
                lastMsg = lastMsg.substring(0, 100) + "...";
            }
            
            return com.aistudyplanner.model.dto.response.ChatSessionResponse.builder()
                    .sessionId(sessionId)
                    .title(title)
                    .createdAt(firstMessage.getCreatedAt())
                    .lastMessage(lastMsg)
                    .lastMessageAt(lastMessage.getCreatedAt())
                    .build();
        }).filter(java.util.Objects::nonNull)
          .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void clearChatHistory(UUID studentId, String sessionId) {
        List<ChatHistory> history = chatHistoryRepository.findByStudentIdAndSessionIdOrderByCreatedAtAsc(studentId, sessionId);
        chatHistoryRepository.deleteAll(history);
    }

    /**
     * Cleanup old chat sessions (older than 30 days) to prevent database bloat
     */
    @Transactional
    @Scheduled(cron = "0 0 2 * * *")  // Run daily at 2 AM
    public void cleanupOldChatSessions() {
        java.time.OffsetDateTime thirtyDaysAgo = java.time.OffsetDateTime.now().minusDays(30);
        List<ChatHistory> oldMessages = chatHistoryRepository.findAllByCreatedAtBefore(thirtyDaysAgo);
        if (!oldMessages.isEmpty()) {
            chatHistoryRepository.deleteAll(oldMessages);
            org.slf4j.LoggerFactory.getLogger(this.getClass())
                    .info("Cleaned up {} old chat messages", oldMessages.size());
        }
    }

    public String generateNewSessionId() {
        return UUID.randomUUID().toString();
    }
}

package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.request.ChatRequest;
import com.aistudyplanner.model.dto.response.AiChatResponse;
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
        
        String assistantReply = groqService.chat(request.getMessage(), history);

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

    @Transactional(readOnly = true)
    public List<ChatHistory> getChatHistory(UUID studentId, String sessionId) {
        // Limit to last 50 messages
        return chatHistoryRepository.findTop50ByStudentIdAndSessionIdOrderByCreatedAtDesc(studentId, sessionId);
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

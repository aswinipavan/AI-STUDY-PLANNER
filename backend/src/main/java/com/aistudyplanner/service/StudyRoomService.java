package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.dto.request.CreateStudyRoomRequest;
import com.aistudyplanner.model.dto.request.StudyRoomMessageRequest;
import com.aistudyplanner.model.dto.response.StudyRoomMessageResponse;
import com.aistudyplanner.model.dto.response.StudyRoomParticipantResponse;
import com.aistudyplanner.model.dto.response.StudyRoomResponse;
import com.aistudyplanner.model.entity.*;
import com.aistudyplanner.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudyRoomService {

    private final StudyRoomRepository studyRoomRepository;
    private final StudyRoomParticipantRepository participantRepository;
    private final StudyRoomMessageRepository messageRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final GroqService groqService;

    private static final String CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public StudyRoomResponse createRoom(UUID studentId, CreateStudyRoomRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Subject subject = null;
        String subjectName = request.getSubjectName();
        if (request.getSubjectId() != null) {
            subject = subjectRepository.findById(request.getSubjectId()).orElse(null);
            if (subject != null) {
                subjectName = subject.getSubjectName();
            }
        }

        String roomCode = generateUniqueRoomCode(subject);
        int duration = request.getDurationMinutes() != null ? request.getDurationMinutes() : 50;
        int maxParts = request.getMaxParticipants() != null ? request.getMaxParticipants() : 4;
        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(duration);

        StudyRoom room = StudyRoom.builder()
                .roomCode(roomCode)
                .owner(student)
                .subject(subject)
                .subjectName(subjectName != null ? subjectName : "General Study")
                .topic(request.getTopic() != null ? request.getTopic() : "Focus Session")
                .durationMinutes(duration)
                .maxParticipants(maxParts)
                .status("ACTIVE")
                .expiresAt(expiresAt)
                .build();

        StudyRoom savedRoom = studyRoomRepository.save(room);

        // Add creator as owner participant
        StudyRoomParticipant ownerParticipant = StudyRoomParticipant.builder()
                .room(savedRoom)
                .student(student)
                .studentName(student.getFullName() != null ? student.getFullName() : "Host")
                .avatarUrl(student.getProfilePictureUrl())
                .isOwner(true)
                .build();
        participantRepository.save(ownerParticipant);

        // Add welcome message
        StudyRoomMessage welcomeMsg = StudyRoomMessage.builder()
                .room(savedRoom)
                .sender(null)
                .senderName("AI Study Assistant")
                .message(String.format("👋 Welcome to the collaborative study room for **%s** (%s)! The shared timer is set for %d minutes. Click 'Ask AI' anytime to clarify doubts.",
                        savedRoom.getSubjectName(), savedRoom.getTopic(), duration))
                .isAi(true)
                .build();
        messageRepository.save(welcomeMsg);

        return mapToResponse(savedRoom, studentId);
    }

    @Transactional
    public StudyRoomResponse getRoomByCode(UUID studentId, String roomCode) {
        StudyRoom room = studyRoomRepository.findByRoomCodeIgnoreCase(roomCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Study room not found with code: " + roomCode));

        checkAndExpireRoom(room);
        return mapToResponse(room, studentId);
    }

    @Transactional
    public StudyRoomResponse joinRoom(UUID studentId, String roomCode) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        StudyRoom room = studyRoomRepository.findByRoomCodeIgnoreCase(roomCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Study room not found with code: " + roomCode));

        checkAndExpireRoom(room);
        if (!"ACTIVE".equalsIgnoreCase(room.getStatus())) {
            throw new IllegalArgumentException("This study room is no longer active.");
        }

        long currentCount = participantRepository.countByRoomId(room.getId());
        var existingOpt = participantRepository.findByRoomIdAndStudentId(room.getId(), studentId);

        if (existingOpt.isEmpty()) {
            if (currentCount >= room.getMaxParticipants()) {
                throw new IllegalArgumentException("Study room is full (maximum " + room.getMaxParticipants() + " participants).");
            }

            StudyRoomParticipant participant = StudyRoomParticipant.builder()
                    .room(room)
                    .student(student)
                    .studentName(student.getFullName() != null ? student.getFullName() : "Student")
                    .avatarUrl(student.getProfilePictureUrl())
                    .isOwner(room.getOwner().getId().equals(studentId))
                    .build();
            participantRepository.save(participant);

            // Announce join
            StudyRoomMessage joinMsg = StudyRoomMessage.builder()
                    .room(room)
                    .sender(student)
                    .senderName("System")
                    .message("👋 " + (student.getFullName() != null ? student.getFullName() : "A student") + " joined the room.")
                    .isAi(false)
                    .build();
            messageRepository.save(joinMsg);
        }

        return mapToResponse(room, studentId);
    }

    @Transactional
    public void leaveRoom(UUID studentId, String roomCode) {
        StudyRoom room = studyRoomRepository.findByRoomCodeIgnoreCase(roomCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Study room not found"));

        participantRepository.deleteByRoomIdAndStudentId(room.getId(), studentId);

        Student student = studentRepository.findById(studentId).orElse(null);
        String name = student != null && student.getFullName() != null ? student.getFullName() : "A student";

        StudyRoomMessage leaveMsg = StudyRoomMessage.builder()
                .room(room)
                .sender(student)
                .senderName("System")
                .message("👋 " + name + " left the room.")
                .isAi(false)
                .build();
        messageRepository.save(leaveMsg);

        if (participantRepository.countByRoomId(room.getId()) == 0) {
            room.setStatus("COMPLETED");
            studyRoomRepository.save(room);
        }
    }

    @Transactional
    public void endRoom(UUID studentId, String roomCode) {
        StudyRoom room = studyRoomRepository.findByRoomCodeIgnoreCase(roomCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Study room not found"));

        if (!room.getOwner().getId().equals(studentId)) {
            throw new IllegalArgumentException("Only the room owner can end this study room.");
        }

        room.setStatus("COMPLETED");
        studyRoomRepository.save(room);

        StudyRoomMessage endMsg = StudyRoomMessage.builder()
                .room(room)
                .sender(null)
                .senderName("AI Study Assistant")
                .message("🏁 The study session has been concluded by the host. Great job studying together!")
                .isAi(true)
                .build();
        messageRepository.save(endMsg);
    }

    @Transactional
    public StudyRoomMessageResponse sendMessage(UUID studentId, String roomCode, StudyRoomMessageRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        StudyRoom room = studyRoomRepository.findByRoomCodeIgnoreCase(roomCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Study room not found"));

        checkAndExpireRoom(room);
        if (!"ACTIVE".equalsIgnoreCase(room.getStatus())) {
            throw new IllegalArgumentException("Cannot send messages to an inactive room.");
        }

        StudyRoomMessage userMsg = StudyRoomMessage.builder()
                .room(room)
                .sender(student)
                .senderName(student.getFullName() != null ? student.getFullName() : "Student")
                .message(request.getMessage())
                .isAi(false)
                .build();
        StudyRoomMessage savedUserMsg = messageRepository.save(userMsg);

        // If user asked AI or flagged as AI query
        String rawText = request.getMessage().trim();
        boolean isAiQuery = Boolean.TRUE.equals(request.getIsAi()) ||
                rawText.toLowerCase().startsWith("@ai") ||
                rawText.toLowerCase().startsWith("ask ai");

        if (isAiQuery) {
            String cleanQuery = rawText.replaceAll("^(?i)(@ai|ask ai)[\\s:]*", "").trim();
            if (cleanQuery.isBlank()) cleanQuery = rawText;

            String roomContext = String.format("Current Collaborative Study Room: Subject '%s', Topic '%s'.",
                    room.getSubjectName(), room.getTopic());
            
            String aiAnswer = groqService.chat(cleanQuery, Collections.emptyList(), roomContext);

            StudyRoomMessage aiMsg = StudyRoomMessage.builder()
                    .room(room)
                    .sender(null)
                    .senderName("AI Study Assistant")
                    .message(aiAnswer)
                    .isAi(true)
                    .build();
            messageRepository.save(aiMsg);
        }

        return mapToMessageResponse(savedUserMsg);
    }

    @Transactional(readOnly = true)
    public List<StudyRoomMessageResponse> getMessages(UUID studentId, String roomCode) {
        StudyRoom room = studyRoomRepository.findByRoomCodeIgnoreCase(roomCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Study room not found"));

        return messageRepository.findTop100ByRoomIdOrderByCreatedAtAsc(room.getId()).stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StudyRoomResponse> getActiveRooms(UUID studentId) {
        return studyRoomRepository.findActiveRooms().stream()
                .map(r -> mapToResponse(r, studentId))
                .collect(Collectors.toList());
    }

    private void checkAndExpireRoom(StudyRoom room) {
        if ("ACTIVE".equalsIgnoreCase(room.getStatus()) && room.getExpiresAt() != null) {
            if (OffsetDateTime.now().isAfter(room.getExpiresAt())) {
                room.setStatus("EXPIRED");
                studyRoomRepository.save(room);
            }
        }
    }

    private String generateUniqueRoomCode(Subject subject) {
        String prefix = "STUDY";
        if (subject != null && subject.getSubjectCode() != null && !subject.getSubjectCode().isBlank()) {
            prefix = subject.getSubjectCode().replaceAll("[^A-Za-z0-9]", "").toUpperCase();
            if (prefix.length() > 5) prefix = prefix.substring(0, 5);
        } else if (subject != null && subject.getSubjectName() != null) {
            prefix = subject.getSubjectName().replaceAll("[^A-Za-z0-9]", "").toUpperCase();
            if (prefix.length() > 4) prefix = prefix.substring(0, 4);
        }

        for (int i = 0; i < 10; i++) {
            StringBuilder code = new StringBuilder(prefix).append("-");
            for (int j = 0; j < 4; j++) {
                code.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            String candidate = code.toString();
            if (studyRoomRepository.findByRoomCodeIgnoreCase(candidate).isEmpty()) {
                return candidate;
            }
        }
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
    }

    private StudyRoomResponse mapToResponse(StudyRoom room, UUID studentId) {
        List<StudyRoomParticipant> parts = participantRepository.findAllByRoomIdOrderByJoinedAtAsc(room.getId());
        List<StudyRoomMessage> msgs = messageRepository.findTop100ByRoomIdOrderByCreatedAtAsc(room.getId());

        Long secondsRemaining = 0L;
        if ("ACTIVE".equalsIgnoreCase(room.getStatus()) && room.getExpiresAt() != null) {
            secondsRemaining = Math.max(0, ChronoUnit.SECONDS.between(OffsetDateTime.now(), room.getExpiresAt()));
        }

        return StudyRoomResponse.builder()
                .id(room.getId())
                .roomCode(room.getRoomCode())
                .ownerId(room.getOwner().getId())
                .ownerName(room.getOwner().getFullName() != null ? room.getOwner().getFullName() : "Host")
                .subjectId(room.getSubject() != null ? room.getSubject().getId() : null)
                .subjectName(room.getSubjectName())
                .topic(room.getTopic())
                .durationMinutes(room.getDurationMinutes())
                .maxParticipants(room.getMaxParticipants())
                .currentParticipantsCount(parts.size())
                .status(room.getStatus())
                .createdAt(room.getCreatedAt())
                .expiresAt(room.getExpiresAt())
                .secondsRemaining(secondsRemaining)
                .participants(parts.stream().map(p -> StudyRoomParticipantResponse.builder()
                        .id(p.getId())
                        .studentId(p.getStudent().getId())
                        .studentName(p.getStudentName())
                        .avatarUrl(p.getAvatarUrl())
                        .isOwner(p.getIsOwner())
                        .joinedAt(p.getJoinedAt())
                        .build()).collect(Collectors.toList()))
                .recentMessages(msgs.stream().map(this::mapToMessageResponse).collect(Collectors.toList()))
                .build();
    }

    private StudyRoomMessageResponse mapToMessageResponse(StudyRoomMessage m) {
        return StudyRoomMessageResponse.builder()
                .id(m.getId())
                .senderId(m.getSender() != null ? m.getSender().getId() : null)
                .senderName(m.getSenderName())
                .message(m.getMessage())
                .isAi(m.getIsAi())
                .createdAt(m.getCreatedAt())
                .build();
    }

    @Scheduled(cron = "0 */10 * * * *") // Check every 10 minutes
    @Transactional
    public void cleanupExpiredRooms() {
        List<StudyRoom> activeRooms = studyRoomRepository.findActiveRooms();
        OffsetDateTime now = OffsetDateTime.now();
        for (StudyRoom room : activeRooms) {
            if (room.getExpiresAt() != null && now.isAfter(room.getExpiresAt())) {
                room.setStatus("EXPIRED");
                studyRoomRepository.save(room);
            }
        }
    }
}

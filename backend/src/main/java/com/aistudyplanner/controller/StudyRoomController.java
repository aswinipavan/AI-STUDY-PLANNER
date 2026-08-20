package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.CreateStudyRoomRequest;
import com.aistudyplanner.model.dto.request.StudyRoomMessageRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.StudyRoomMessageResponse;
import com.aistudyplanner.model.dto.response.StudyRoomResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.StudyRoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/study-rooms")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "Study Together", description = "Collaborative Study Room APIs")
public class StudyRoomController {

    private final StudyRoomService studyRoomService;

    @PostMapping
    @Operation(summary = "Create a new collaborative study room")
    public ResponseEntity<ApiResponse<StudyRoomResponse>> createRoom(
            @CurrentStudent Student student,
            @Valid @RequestBody CreateStudyRoomRequest request) {
        log.info("Student {} creating study room for subject: {}", student.getId(), request.getSubjectName());
        StudyRoomResponse response = studyRoomService.createRoom(student.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Study room created successfully"));
    }

    @GetMapping("/{code}")
    @Operation(summary = "Get study room details by room code")
    public ResponseEntity<ApiResponse<StudyRoomResponse>> getRoom(
            @CurrentStudent Student student,
            @PathVariable String code) {
        StudyRoomResponse response = studyRoomService.getRoomByCode(student.getId(), code);
        return ResponseEntity.ok(ApiResponse.success(response, "Study room fetched successfully"));
    }

    @PostMapping("/{code}/join")
    @Operation(summary = "Join an active study room with room code")
    public ResponseEntity<ApiResponse<StudyRoomResponse>> joinRoom(
            @CurrentStudent Student student,
            @PathVariable String code) {
        log.info("Student {} joining study room {}", student.getId(), code);
        StudyRoomResponse response = studyRoomService.joinRoom(student.getId(), code);
        return ResponseEntity.ok(ApiResponse.success(response, "Joined study room successfully"));
    }

    @PostMapping("/{code}/leave")
    @Operation(summary = "Leave a study room")
    public ResponseEntity<ApiResponse<Void>> leaveRoom(
            @CurrentStudent Student student,
            @PathVariable String code) {
        log.info("Student {} leaving study room {}", student.getId(), code);
        studyRoomService.leaveRoom(student.getId(), code);
        return ResponseEntity.ok(ApiResponse.success(null, "Left study room successfully"));
    }

    @PostMapping("/{code}/end")
    @Operation(summary = "End a study room (Host only)")
    public ResponseEntity<ApiResponse<Void>> endRoom(
            @CurrentStudent Student student,
            @PathVariable String code) {
        log.info("Student {} ending study room {}", student.getId(), code);
        studyRoomService.endRoom(student.getId(), code);
        return ResponseEntity.ok(ApiResponse.success(null, "Study room ended successfully"));
    }

    @PostMapping("/{code}/messages")
    @Operation(summary = "Send a message or Ask AI in a study room")
    public ResponseEntity<ApiResponse<StudyRoomMessageResponse>> sendMessage(
            @CurrentStudent Student student,
            @PathVariable String code,
            @Valid @RequestBody StudyRoomMessageRequest request) {
        StudyRoomMessageResponse response = studyRoomService.sendMessage(student.getId(), code, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Message sent successfully"));
    }

    @GetMapping("/{code}/messages")
    @Operation(summary = "Get recent messages in a study room")
    public ResponseEntity<ApiResponse<List<StudyRoomMessageResponse>>> getMessages(
            @CurrentStudent Student student,
            @PathVariable String code) {
        List<StudyRoomMessageResponse> response = studyRoomService.getMessages(student.getId(), code);
        return ResponseEntity.ok(ApiResponse.success(response, "Messages fetched successfully"));
    }

    @GetMapping("/active")
    @Operation(summary = "Get all active study rooms")
    public ResponseEntity<ApiResponse<List<StudyRoomResponse>>> getActiveRooms(
            @CurrentStudent Student student) {
        List<StudyRoomResponse> response = studyRoomService.getActiveRooms(student.getId());
        return ResponseEntity.ok(ApiResponse.success(response, "Active study rooms fetched successfully"));
    }
}

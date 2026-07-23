package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.SlotRequest;
import com.aistudyplanner.model.dto.request.TimetableRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.SlotResponse;
import com.aistudyplanner.model.dto.response.TimetableResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.TimetableService;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/timetable")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "Timetable", description = "AI Timetable Management APIs")
public class TimetableController {

    private final TimetableService timetableService;

    @PostMapping("/generate")
    @Operation(summary = "Generate AI Timetable")
    public ResponseEntity<ApiResponse<TimetableResponse>> generateAiTimetable(
            @CurrentStudent Student student,
            @Valid @RequestBody TimetableRequest request) {
        log.info("Generating AI timetable for student: {}", student.getId());
        TimetableResponse response = timetableService.generateAiTimetable(student.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Timetable generated successfully"));
    }

    @PostMapping("/custom")
    @Operation(summary = "Create custom Timetable")
    public ResponseEntity<ApiResponse<TimetableResponse>> customCreateTimetable(
            @CurrentStudent Student student,
            @Valid @RequestBody TimetableRequest request) {
        log.info("Creating custom timetable for student: {}", student.getId());
        TimetableResponse response = timetableService.customCreateTimetable(student.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Custom timetable created successfully"));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active Timetable")
    public ResponseEntity<ApiResponse<TimetableResponse>> getActiveTimetable(@CurrentStudent Student student) {
        log.info("Fetching active timetable for student: {}", student.getId());
        TimetableResponse response = timetableService.getTimetable(student.getId());
        return ResponseEntity.ok(ApiResponse.success(response, "Active timetable fetched successfully"));
    }

    @GetMapping("/all")
    @Operation(summary = "Get all Timetables")
    public ResponseEntity<ApiResponse<List<TimetableResponse>>> getAllTimetables(@CurrentStudent Student student) {
        log.info("Fetching all timetables for student: {}", student.getId());
        List<TimetableResponse> responses = timetableService.getAllTimetables(student.getId());
        return ResponseEntity.ok(ApiResponse.success(responses, "Timetables fetched successfully"));
    }

    @PutMapping("/slots/{slotId}")
    @Operation(summary = "Update a specific slot")
    public ResponseEntity<ApiResponse<SlotResponse>> updateSlot(
            @CurrentStudent Student student,
            @PathVariable UUID slotId,
            @Valid @RequestBody SlotRequest request) {
        log.info("Updating slot: {} for student: {}", slotId, student.getId());
        SlotResponse response = timetableService.updateSlot(student.getId(), slotId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Slot updated successfully"));
    }

    @PatchMapping("/slots/{slotId}/complete")
    @Operation(summary = "Toggle slot completion status")
    public ResponseEntity<ApiResponse<SlotResponse>> markSlotComplete(
            @CurrentStudent Student student,
            @PathVariable UUID slotId) {
        log.info("Toggling completion for slot: {} for student: {}", slotId, student.getId());
        SlotResponse response = timetableService.markSlotComplete(student.getId(), slotId);
        return ResponseEntity.ok(ApiResponse.success(response, "Slot completion toggled successfully"));
    }

    @DeleteMapping("/{timetableId}")
    @Operation(summary = "Delete timetable")
    public ResponseEntity<Void> deleteTimetable(
            @CurrentStudent Student student,
            @PathVariable UUID timetableId) {
        log.info("Deleting timetable: {} for student: {}", timetableId, student.getId());
        timetableService.deleteTimetable(student.getId(), timetableId);
        return ResponseEntity.noContent().build();
    }
}

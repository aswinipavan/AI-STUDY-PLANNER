package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.CompleteRevisionRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.SlotRevisionResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.SlotRevisionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/timetable/slots/{slotId}/revision")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "AI Revision Mode", description = "Focused 5-15 minute AI revision experience for completed & verified study sessions")
public class SlotRevisionController {

    private final SlotRevisionService slotRevisionService;

    @GetMapping
    @Operation(summary = "Get or generate AI revision experience for a completed study session")
    public ResponseEntity<ApiResponse<SlotRevisionResponse>> getOrGenerateRevision(
            @CurrentStudent Student student,
            @PathVariable UUID slotId) {
        log.info("Fetching / generating AI revision for slot: {} by student: {}", slotId, student.getId());
        SlotRevisionResponse response = slotRevisionService.getOrGenerateRevision(student.getId(), slotId);
        return ResponseEntity.ok(ApiResponse.success(response, "Revision experience generated successfully"));
    }

    @PostMapping("/complete")
    @Operation(summary = "Complete AI revision session with quiz score")
    public ResponseEntity<ApiResponse<SlotRevisionResponse>> completeRevision(
            @CurrentStudent Student student,
            @PathVariable UUID slotId,
            @Valid @RequestBody CompleteRevisionRequest request) {
        log.info("Completing AI revision for slot: {} with score: {} by student: {}", slotId, request.getScore(), student.getId());
        SlotRevisionResponse response = slotRevisionService.completeRevision(student.getId(), slotId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Revision completed successfully"));
    }
}

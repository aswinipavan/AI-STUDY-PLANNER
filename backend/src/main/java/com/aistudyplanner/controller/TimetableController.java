package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.GenerateTimetableRequest;
import com.aistudyplanner.model.dto.request.SlotRequest;
import com.aistudyplanner.model.dto.request.TimetableRequest;
import com.aistudyplanner.model.dto.response.AdaptationResponse;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.SlotResponse;
import com.aistudyplanner.model.dto.response.SubjectReadinessResponse;
import com.aistudyplanner.model.dto.response.TimetableResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.AdaptiveScheduleService;
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
    private final AdaptiveScheduleService adaptiveScheduleService;
    private final com.aistudyplanner.service.StudyEvidenceVerificationService studyEvidenceVerificationService;

    @PostMapping("/generate")
    @Operation(summary = "Generate AI Timetable")
    public ResponseEntity<ApiResponse<TimetableResponse>> generateAiTimetable(
            @CurrentStudent Student student,
            @Valid @RequestBody GenerateTimetableRequest request) {
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

    @PostMapping(value = "/slots/{slotId}/evidence", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit and AI-verify study evidence proof for a slot")
    public ResponseEntity<ApiResponse<com.aistudyplanner.model.dto.response.StudyEvidenceResponse>> submitStudyEvidence(
            @CurrentStudent Student student,
            @PathVariable UUID slotId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        log.info("Submitting study evidence for slot: {} by student: {}", slotId, student.getId());
        com.aistudyplanner.model.dto.response.StudyEvidenceResponse response = studyEvidenceVerificationService.submitAndVerifyEvidence(student.getId(), slotId, file);
        return ResponseEntity.ok(ApiResponse.success(response, "Study proof evidence analyzed successfully"));
    }

    @GetMapping("/slots/{slotId}/evidence")
    @Operation(summary = "Get latest study evidence submission for a slot")
    public ResponseEntity<ApiResponse<com.aistudyplanner.model.dto.response.StudyEvidenceResponse>> getLatestEvidence(
            @CurrentStudent Student student,
            @PathVariable UUID slotId) {
        log.info("Fetching latest study evidence for slot: {} by student: {}", slotId, student.getId());
        com.aistudyplanner.model.dto.response.StudyEvidenceResponse response = studyEvidenceVerificationService.getLatestEvidenceForSlot(student.getId(), slotId);
        return ResponseEntity.ok(ApiResponse.success(response, "Latest evidence fetched successfully"));
    }

    @PostMapping("/slots/{slotId}/approve-completion")
    @Operation(summary = "Approve and complete slot using verified study evidence")
    public ResponseEntity<ApiResponse<SlotResponse>> approveSlotCompletion(
            @CurrentStudent Student student,
            @PathVariable UUID slotId,
            @Valid @RequestBody com.aistudyplanner.model.dto.request.ApproveCompletionRequest request) {
        log.info("Approving slot completion: {} with evidence: {} for student: {}", slotId, request.getEvidenceId(), student.getId());
        SlotResponse response = timetableService.approveSlotCompletion(student.getId(), slotId, request.getEvidenceId());
        return ResponseEntity.ok(ApiResponse.success(response, "Study session approved and completed successfully"));
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

    /**
     * Re-plan the open future of the active timetable against the student's current reality —
     * completed sessions, missed sessions, newly processed material, exam dates and marks.
     *
     * <p>History and already-completed sessions are preserved; only still-open upcoming sessions are
     * rewritten. The response explains, in plain language, every adjustment that was made.</p>
     *
     * @param trigger optional hint about what caused the adaptation (SESSION_COMPLETED,
     *                NEW_MATERIAL, EXAM_CHANGED, MARKS_CHANGED, MISSED_SESSIONS); used for wording only
     */
    @PostMapping("/adapt")
    @Operation(summary = "Adapt the active timetable to current progress, material, marks and exams")
    public ResponseEntity<ApiResponse<AdaptationResponse>> adapt(
            @CurrentStudent Student student,
            @RequestParam(required = false) String trigger) {
        log.info("Adapting timetable for student: {} (trigger: {})", student.getId(), trigger);
        AdaptationResponse response = adaptiveScheduleService.adapt(student.getId(), trigger);
        return ResponseEntity.ok(ApiResponse.success(response, response.getSummary()));
    }

    /** Read-only adaptive insight: per-subject coverage, readiness, priority and the reasons behind them. */
    @GetMapping("/insights")
    @Operation(summary = "Per-subject adaptive readiness and priority signals")
    public ResponseEntity<ApiResponse<List<SubjectReadinessResponse>>> getInsights(@CurrentStudent Student student) {
        List<SubjectReadinessResponse> insights = adaptiveScheduleService.getSubjectReadiness(student.getId());
        return ResponseEntity.ok(ApiResponse.success(insights, "Adaptive insights fetched successfully"));
    }
}

package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.MarksRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.MarksResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.MarksService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/marks")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "Marks", description = "Marks Management APIs")
public class MarksController {

    private final MarksService marksService;

    @PostMapping("/")
    @Operation(summary = "Add marks")
    public ResponseEntity<ApiResponse<MarksResponse>> addMarks(
            @CurrentStudent Student student,
            @Valid @RequestBody MarksRequest request) {
        log.info("Adding marks for student: {}", student.getId());
        MarksResponse response = marksService.addMarks(student.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Marks added successfully"));
    }

    @GetMapping("/")
    @Operation(summary = "Get all marks with pagination")
    public ResponseEntity<ApiResponse<Page<MarksResponse>>> getAllMarks(
            @CurrentStudent Student student,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int pageSize) {
        log.info("Fetching all marks for student: {} (page: {}, size: {})", student.getId(), page, pageSize);
        Page<MarksResponse> responses = marksService.getAllMarksPaginated(student.getId(), page, pageSize);
        return ResponseEntity.ok(ApiResponse.success(responses, "Marks fetched successfully"));
    }

    @GetMapping("/subject/{subjectId}")
    @Operation(summary = "Get marks by subject with pagination")
    public ResponseEntity<ApiResponse<Page<MarksResponse>>> getMarksBySubject(
            @CurrentStudent Student student,
            @PathVariable UUID subjectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int pageSize) {
        log.info("Fetching marks for subject: {} and student: {} (page: {}, size: {})", subjectId, student.getId(), page, pageSize);
        Page<MarksResponse> responses = marksService.getMarksBySubjectPaginated(student.getId(), subjectId, page, pageSize);
        return ResponseEntity.ok(ApiResponse.success(responses, "Subject marks fetched successfully"));
    }

    @GetMapping("/averages")
    @Operation(summary = "Get subject-wise averages")
    public ResponseEntity<ApiResponse<Map<String, Double>>> getSubjectWiseAverages(@CurrentStudent Student student) {
        log.info("Fetching subject-wise averages for student: {}", student.getId());
        Map<String, Double> averages = marksService.getSubjectWiseAverages(student.getId());
        return ResponseEntity.ok(ApiResponse.success(averages, "Averages fetched successfully"));
    }

    @PutMapping("/{marksId}")
    @Operation(summary = "Update marks")
    public ResponseEntity<ApiResponse<MarksResponse>> updateMarks(
            @CurrentStudent Student student,
            @PathVariable UUID marksId,
            @Valid @RequestBody MarksRequest request) {
        log.info("Updating marks: {} for student: {}", marksId, student.getId());
        MarksResponse response = marksService.updateMarks(student.getId(), marksId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Marks updated successfully"));
    }

    @DeleteMapping("/{marksId}")
    @Operation(summary = "Delete marks")
    public ResponseEntity<Void> deleteMarks(
            @CurrentStudent Student student,
            @PathVariable UUID marksId) {
        log.info("Deleting marks: {} for student: {}", marksId, student.getId());
        marksService.deleteMarks(student.getId(), marksId);
        return ResponseEntity.noContent().build();
    }
}

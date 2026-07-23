package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.ExamRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.ExamResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.ExamService;
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
@RequestMapping("/api/exams")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "Exam", description = "Exam Management APIs")
public class ExamController {

    private final ExamService examService;

    @PostMapping("/")
    @Operation(summary = "Create an exam")
    public ResponseEntity<ApiResponse<ExamResponse>> createExam(
            @CurrentStudent Student student,
            @Valid @RequestBody ExamRequest request) {
        log.info("Creating exam for student: {}", student.getId());
        ExamResponse response = examService.createExam(student.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Exam created successfully"));
    }

    @GetMapping("/")
    @Operation(summary = "Get all exams")
    public ResponseEntity<ApiResponse<List<ExamResponse>>> getAllExams(@CurrentStudent Student student) {
        log.info("Fetching all exams for student: {}", student.getId());
        List<ExamResponse> responses = examService.getAllExams(student.getId());
        return ResponseEntity.ok(ApiResponse.success(responses, "Exams fetched successfully"));
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Get upcoming exams")
    public ResponseEntity<ApiResponse<List<ExamResponse>>> getUpcomingExams(@CurrentStudent Student student) {
        log.info("Fetching upcoming exams for student: {}", student.getId());
        List<ExamResponse> responses = examService.getUpcomingExams(student.getId());
        return ResponseEntity.ok(ApiResponse.success(responses, "Upcoming exams fetched successfully"));
    }

    @PutMapping("/{examId}")
    @Operation(summary = "Update an exam")
    public ResponseEntity<ApiResponse<ExamResponse>> updateExam(
            @CurrentStudent Student student,
            @PathVariable UUID examId,
            @Valid @RequestBody ExamRequest request) {
        log.info("Updating exam: {} for student: {}", examId, student.getId());
        ExamResponse response = examService.updateExam(student.getId(), examId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Exam updated successfully"));
    }

    @PatchMapping("/{examId}/complete")
    @Operation(summary = "Mark exam as complete")
    public ResponseEntity<ApiResponse<ExamResponse>> markExamComplete(
            @CurrentStudent Student student,
            @PathVariable UUID examId) {
        log.info("Marking exam: {} complete for student: {}", examId, student.getId());
        ExamResponse response = examService.markExamComplete(student.getId(), examId);
        return ResponseEntity.ok(ApiResponse.success(response, "Exam marked complete successfully"));
    }

    @DeleteMapping("/{examId}")
    @Operation(summary = "Delete an exam")
    public ResponseEntity<Void> deleteExam(
            @CurrentStudent Student student,
            @PathVariable UUID examId) {
        log.info("Deleting exam: {} for student: {}", examId, student.getId());
        examService.deleteExam(student.getId(), examId);
        return ResponseEntity.noContent().build();
    }
}

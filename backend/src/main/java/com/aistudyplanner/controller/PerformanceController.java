package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.PerformanceResponse;
import com.aistudyplanner.model.dto.response.SubjectResponse;
import com.aistudyplanner.model.entity.PerformanceSnapshot;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.PerformanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/performance")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "Performance", description = "Performance Analytics APIs")
public class PerformanceController {

    private final PerformanceService performanceService;

    @GetMapping("/report")
    @Operation(summary = "Get comprehensive performance report")
    public ResponseEntity<ApiResponse<PerformanceResponse>> getPerformanceReport(@CurrentStudent Student student) {
        log.info("Fetching performance report for student: {}", student.getId());
        PerformanceResponse response = performanceService.getPerformanceReport(student.getId());
        return ResponseEntity.ok(ApiResponse.success(response, "Performance report fetched successfully"));
    }

    @GetMapping("/history")
    @Operation(summary = "Get historical performance snapshots")
    public ResponseEntity<ApiResponse<List<PerformanceSnapshot>>> getHistoricalSnapshots(@CurrentStudent Student student) {
        log.info("Fetching historical snapshots for student: {}", student.getId());
        List<PerformanceSnapshot> snapshots = performanceService.getHistoricalSnapshots(student.getId());
        return ResponseEntity.ok(ApiResponse.success(snapshots, "Historical snapshots fetched successfully"));
    }

    @GetMapping("/priority")
    @Operation(summary = "Get subjects ordered by priority (weakest first)")
    public ResponseEntity<ApiResponse<List<SubjectResponse>>> getPrioritySubjects(@CurrentStudent Student student) {
        log.info("Fetching priority subjects for student: {}", student.getId());
        List<SubjectResponse> responses = performanceService.getPrioritySubjects(student.getId());
        return ResponseEntity.ok(ApiResponse.success(responses, "Priority subjects fetched successfully"));
    }
}

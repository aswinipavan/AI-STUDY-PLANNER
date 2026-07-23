package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.SubjectRequest;
import com.aistudyplanner.model.dto.request.UpdateProfileRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.StudentResponse;
import com.aistudyplanner.model.dto.response.SubjectResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.StudentService;
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
@RequestMapping("/api/students")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "Student", description = "Student Profile and Subject Management")
public class StudentController {

    private final StudentService studentService;

    @GetMapping("/me")
    @Operation(summary = "Get current student profile")
    public ResponseEntity<ApiResponse<StudentResponse>> getProfile(@CurrentStudent Student student) {
        log.info("Fetching profile for student: {}", student.getId());
        StudentResponse response = studentService.getProfile(student.getId());
        return ResponseEntity.ok(ApiResponse.success(response, "Profile fetched successfully"));
    }

    @PutMapping("/me")
    @Operation(summary = "Update current student profile")
    public ResponseEntity<ApiResponse<StudentResponse>> updateProfile(
            @CurrentStudent Student student,
            @Valid @RequestBody UpdateProfileRequest request) {
        log.info("Updating profile for student: {}", student.getId());
        StudentResponse response = studentService.updateProfile(student.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response, "Profile updated successfully"));
    }

    @GetMapping("/me/subjects")
    @Operation(summary = "Get subjects of current student")
    public ResponseEntity<ApiResponse<List<SubjectResponse>>> getSubjects(@CurrentStudent Student student) {
        log.info("Fetching subjects for student: {}", student.getId());
        List<SubjectResponse> responses = studentService.getSubjects(student.getId());
        return ResponseEntity.ok(ApiResponse.success(responses, "Subjects fetched successfully"));
    }

    @PostMapping("/me/subjects")
    @Operation(summary = "Add a new subject")
    public ResponseEntity<ApiResponse<SubjectResponse>> createSubject(
            @CurrentStudent Student student,
            @Valid @RequestBody SubjectRequest request) {
        log.info("Creating subject for student: {}", student.getId());
        SubjectResponse response = studentService.createSubject(student.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Subject created successfully"));
    }

    @PutMapping("/me/subjects/{subjectId}")
    @Operation(summary = "Update a subject")
    public ResponseEntity<ApiResponse<SubjectResponse>> updateSubject(
            @CurrentStudent Student student,
            @PathVariable UUID subjectId,
            @Valid @RequestBody SubjectRequest request) {
        log.info("Updating subject: {} for student: {}", subjectId, student.getId());
        SubjectResponse response = studentService.updateSubject(student.getId(), subjectId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Subject updated successfully"));
    }

    @DeleteMapping("/me/subjects/{subjectId}")
    @Operation(summary = "Delete a subject")
    public ResponseEntity<Void> deleteSubject(
            @CurrentStudent Student student,
            @PathVariable UUID subjectId) {
        log.info("Deleting subject: {} for student: {}", subjectId, student.getId());
        studentService.deleteSubject(student.getId(), subjectId);
        return ResponseEntity.noContent().build();
    }
}

package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.MaterialUploadRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.MaterialResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.MaterialService;
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
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "Material", description = "Study Material Management APIs")
public class MaterialController {

    private final MaterialService materialService;

    @GetMapping("/")
    @Operation(summary = "Get all materials")
    public ResponseEntity<ApiResponse<List<MaterialResponse>>> getMaterials(@CurrentStudent Student student) {
        log.info("Fetching all materials for student: {}", student.getId());
        List<MaterialResponse> responses = materialService.getMaterials(student.getId());
        return ResponseEntity.ok(ApiResponse.success(responses, "Materials fetched successfully"));
    }

    @GetMapping("/subject/{subjectId}")
    @Operation(summary = "Get materials by subject")
    public ResponseEntity<ApiResponse<List<MaterialResponse>>> getMaterialsBySubject(
            @CurrentStudent Student student,
            @PathVariable UUID subjectId) {
        log.info("Fetching materials for subject: {} and student: {}", subjectId, student.getId());
        List<MaterialResponse> responses = materialService.getMaterialsBySubject(student.getId(), subjectId);
        return ResponseEntity.ok(ApiResponse.success(responses, "Subject materials fetched successfully"));
    }

    @GetMapping("/upload-url")
    @Operation(summary = "Get Supabase Storage upload URL")
    public ResponseEntity<ApiResponse<Map<String, String>>> getStorageUploadUrl(
            @CurrentStudent Student student,
            @RequestParam String fileName,
            @RequestParam(required = false) String fileType) {
        log.info("Generating upload URL for file: {}", fileName);
        Map<String, String> uploadInfo = materialService.getStorageUploadUrl(student.getId(), fileName, fileType);
        return ResponseEntity.ok(ApiResponse.success(uploadInfo, "Upload URL generated successfully"));
    }

    @PostMapping("/")
    @Operation(summary = "Save material metadata")
    public ResponseEntity<ApiResponse<MaterialResponse>> saveMaterialMetadata(
            @CurrentStudent Student student,
            @Valid @RequestBody MaterialUploadRequest request,
            @RequestParam String fileUrl,
            @RequestParam String fileType,
            @RequestParam long fileSizeBytes) {
        log.info("Saving material metadata for student: {}", student.getId());
        MaterialResponse response = materialService.saveMaterialMetadata(student.getId(), request, fileUrl, fileType, fileSizeBytes);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Material metadata saved successfully"));
    }

    @PostMapping("/{materialId}/process")
    @Operation(summary = "Trigger re-processing of material with NLP pipeline")
    public ResponseEntity<ApiResponse<MaterialResponse>> reprocessMaterial(
            @CurrentStudent Student student,
            @PathVariable UUID materialId) {
        log.info("Triggering NLP re-processing for material: {} and student: {}", materialId, student.getId());
        MaterialResponse response = materialService.reprocessMaterial(student.getId(), materialId);
        return ResponseEntity.ok(ApiResponse.success(response, "Material re-processing initiated successfully"));
    }

    @DeleteMapping("/{materialId}")
    @Operation(summary = "Delete material metadata")
    public ResponseEntity<Void> deleteMaterial(
            @CurrentStudent Student student,
            @PathVariable UUID materialId) {
        log.info("Deleting material: {} for student: {}", materialId, student.getId());
        materialService.deleteMaterial(student.getId(), materialId);
        return ResponseEntity.noContent().build();
    }
}

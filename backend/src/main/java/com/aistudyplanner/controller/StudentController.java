package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.NotificationPreferencesRequest;
import com.aistudyplanner.model.dto.request.SubjectRequest;
import com.aistudyplanner.model.dto.request.UpdateProfileRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.StudentResponse;
import com.aistudyplanner.model.dto.response.SubjectResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.MaterialService;
import com.aistudyplanner.service.StorageService;
import com.aistudyplanner.service.StudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "Student", description = "Student Profile and Subject Management")
public class StudentController {

    private final StudentService studentService;
    private final MaterialService materialService;
    private final StorageService storageService;

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

    @PutMapping("/me/notifications")
    @Operation(summary = "Update notification preferences")
    public ResponseEntity<ApiResponse<StudentResponse>> updateNotifications(
            @CurrentStudent Student student,
            @Valid @RequestBody NotificationPreferencesRequest request) {
        log.info("Updating notification preferences for student: {}", student.getId());
        StudentResponse response = studentService.updateNotificationPreferences(student.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response, "Notification preferences updated"));
    }

    @DeleteMapping("/me")
    @Operation(summary = "Delete current student account and all associated data")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(@CurrentStudent Student student) {
        log.info("Deleting account for student: {}", student.getId());
        studentService.deleteAccount(student.getId());
        return ResponseEntity.ok(ApiResponse.success(null, "Account deleted successfully"));
    }

    /**
     * Returns a Supabase pre-signed upload URL for profile avatar.
     * Frontend uploads the image directly to Supabase Storage and then calls
     * PUT /api/students/me with { profilePictureUrl } to persist the URL.
     */
    @PostMapping("/me/avatar-upload-url")
    @Operation(summary = "Get avatar upload URL")
    public ResponseEntity<ApiResponse<Map<String, String>>> getAvatarUploadUrl(
            @CurrentStudent Student student,
            @RequestParam String fileName,
            @RequestParam String fileType) {
        log.info("Generating avatar upload URL for student: {}", student.getId());
        Map<String, String> uploadInfo = materialService.getAvatarUploadUrl(student.getId(), fileName, fileType);
        return ResponseEntity.ok(ApiResponse.success(uploadInfo, "Avatar upload URL generated"));
    }

    /**
     * Uploads a profile avatar image in a single multipart request and persists the resulting URL.
     *
     * <p>Replaces the old three-step flow (get signed URL → browser PUT to Supabase → PUT /me), which
     * returned HTTP 400 locally because no Supabase Storage backend is configured. The bytes are sent
     * through {@link StorageService} (Supabase in production, local filesystem otherwise). The stored
     * URL is cache-busted with {@code ?v=<timestamp>} because the object path is stable per student,
     * so the browser would otherwise keep showing the previous image.
     */
    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload profile avatar image")
    public ResponseEntity<ApiResponse<StudentResponse>> uploadAvatar(
            @CurrentStudent Student student,
            @RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        if (file.getSize() > 5L * 1024 * 1024) {
            throw new IllegalArgumentException("Image must be under 5MB");
        }
        String contentType = file.getContentType();
        String ext = avatarExtension(contentType, file.getOriginalFilename());
        if (ext == null) {
            throw new IllegalArgumentException("Only JPG, PNG, WEBP, or GIF images are allowed");
        }

        String objectPath = student.getId() + "/avatar" + ext;
        String fileUrl = storageService.upload("avatars", objectPath, file.getBytes(), contentType);
        // Cache-bust so the browser fetches the new image despite the stable path.
        String cacheBusted = fileUrl + (fileUrl.contains("?") ? "&" : "?") + "v=" + System.currentTimeMillis();

        UpdateProfileRequest req = UpdateProfileRequest.builder().profilePictureUrl(cacheBusted).build();
        StudentResponse response = studentService.updateProfile(student.getId(), req);
        return ResponseEntity.ok(ApiResponse.success(response, "Avatar updated successfully"));
    }

    /** Returns the file extension (with dot) for an allowed avatar image, or null if not allowed. */
    private String avatarExtension(String contentType, String fileName) {
        String ct = contentType != null ? contentType.toLowerCase() : "";
        if (ct.contains("jpeg") || ct.contains("jpg")) return ".jpg";
        if (ct.contains("png")) return ".png";
        if (ct.contains("webp")) return ".webp";
        if (ct.contains("gif")) return ".gif";
        // Fall back to the filename extension when the browser omits a usable content type.
        String lower = fileName != null ? fileName.toLowerCase() : "";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return ".jpg";
        if (lower.endsWith(".png")) return ".png";
        if (lower.endsWith(".webp")) return ".webp";
        if (lower.endsWith(".gif")) return ".gif";
        return null;
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

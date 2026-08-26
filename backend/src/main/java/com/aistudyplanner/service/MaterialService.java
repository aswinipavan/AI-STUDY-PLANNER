package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.dto.request.MaterialUploadRequest;
import com.aistudyplanner.model.dto.response.MaterialResponse;
import com.aistudyplanner.model.entity.Material;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.MaterialRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MaterialService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    /**
     * Supabase anon key — safe to expose to authenticated clients.
     * Frontend includes this as Authorization and apikey headers in PUT upload requests.
     * This is NOT the service role key.
     */
    @Value("${supabase.anon-key:}")
    private String supabaseAnonKey;

    private final MaterialRepository materialRepository;
    private final SubjectRepository subjectRepository;
    private final StudentRepository studentRepository;
    private final GroqService groqService;
    private final StorageService storageService;
    private final com.aistudyplanner.service.nlp.DocumentIntelligenceService documentIntelligenceService;

    /**
     * Upload a study material file and persist its metadata in a single call.
     *
     * <p>The bytes are handed to {@link StorageService}, which stores them on Supabase Storage
     * (production) or the local filesystem (local/offline) and returns a URL. This replaces the old
     * three-step flow (get signed URL → browser PUT to Supabase → save metadata), which failed with
     * HTTP 400 locally because no Supabase Storage backend is configured.
     */
    @Transactional
    public MaterialResponse uploadMaterial(UUID studentId, MultipartFile file, String title,
                                           UUID subjectId, String textPreview) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        long fileSizeBytes = file.getSize();
        if (fileSizeBytes > com.aistudyplanner.util.Constants.MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of 50MB");
        }

        String originalName = file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank()
                ? file.getOriginalFilename() : "file";
        // Preserve the original flow's semantics: fileType is the browser-reported MIME type.
        String fileType = resolveContentType(file.getContentType(), originalName);
        if (!isAllowedFileType(fileType)) {
            throw new IllegalArgumentException("File type not allowed. Allowed: PDF, JPG, JPEG, PNG, WEBP, DOCX, XLS, XLSX, TXT, ZIP");
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Subject subject = null;
        if (subjectId != null) {
            subject = subjectRepository.findById(subjectId).orElse(null);
        }

        // Store the bytes and get a persistable URL.
        String safeName = sanitizeFileName(originalName);
        String objectPath = studentId + "/" + System.currentTimeMillis() + "_" + safeName;
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded file: " + e.getMessage(), e);
        }
        String fileUrl = storageService.upload("materials", objectPath, bytes, fileType);

        com.aistudyplanner.model.MaterialType resolvedType = resolveMaterialType(fileType);

        Material material = Material.builder()
                .student(student)
                .subject(subject)
                .title(title != null && !title.isBlank() ? title : originalName)
                .fileName(originalName)
                .fileUrl(fileUrl)
                .fileType(fileType)
                .fileSizeBytes(fileSizeBytes)
                .materialType(resolvedType)
                .processingStatus(com.aistudyplanner.model.ProcessingStatus.PENDING)
                .build();

        material = materialRepository.save(material);

        // Trigger comprehensive document intelligence pipeline once this upload is committed.
        dispatchProcessingAfterCommit(material.getId(), textPreview);

        return toMaterialResponse(material);
    }

    /**
     * Hand the material to the async NLP pipeline, but only once the surrounding write
     * transaction has actually committed.
     *
     * <p>Previously each caller invoked {@code processMaterialAsync} inline. Because every
     * caller is {@code @Transactional}, the {@code @Async} executor picked the task up on
     * another thread while the inserting transaction was still open, so its own transaction
     * could not see the new row: it logged "Material not found for processing" and returned,
     * leaving {@code processingStatus} stuck on PENDING forever. Deferring the dispatch to
     * {@code afterCommit} guarantees the row is visible to the worker thread.
     *
     * <p>When no transaction is active (direct service call, tests) there is nothing to wait
     * for, so the task is dispatched immediately.
     */
    private void dispatchProcessingAfterCommit(UUID materialId, String textPreview) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    documentIntelligenceService.processMaterialAsync(materialId, textPreview);
                }
            });
        } else {
            documentIntelligenceService.processMaterialAsync(materialId, textPreview);
        }
    }

    /** Derive a MaterialType from a MIME type / extension string. */
    private com.aistudyplanner.model.MaterialType resolveMaterialType(String fileType) {
        String lower = fileType != null ? fileType.toLowerCase() : "";
        if (lower.contains("pdf")) {
            return com.aistudyplanner.model.MaterialType.PDF;
        } else if (lower.contains("image") || lower.contains("jpg") || lower.contains("jpeg")
                || lower.contains("png") || lower.contains("webp")) {
            return com.aistudyplanner.model.MaterialType.IMAGE;
        } else if (lower.contains("doc") || lower.contains("word")) {
            return com.aistudyplanner.model.MaterialType.DOCX;
        }
        return com.aistudyplanner.model.MaterialType.NOTES;
    }

    /** Fall back to an extension-derived MIME type when the browser sends none. */
    private String resolveContentType(String contentType, String fileName) {
        if (contentType != null && !contentType.isBlank()) {
            return contentType;
        }
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".txt")) return "text/plain";
        if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "application/msword";
        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "application/vnd.ms-excel";
        if (lower.endsWith(".zip")) return "application/zip";
        return "application/octet-stream";
    }

    /** Strip characters that would be awkward in a stored path / URL, keeping the extension. */
    private String sanitizeFileName(String name) {
        String cleaned = name.replaceAll("[^a-zA-Z0-9._-]", "_");
        // Avoid absurdly long names.
        return cleaned.length() > 120 ? cleaned.substring(cleaned.length() - 120) : cleaned;
    }

    @Transactional
    public MaterialResponse saveMaterialMetadata(UUID studentId, MaterialUploadRequest request,
                                                 String fileUrl, String fileType, long fileSizeBytes) {
        // Validate file size (max 50MB)
        if (fileSizeBytes > com.aistudyplanner.util.Constants.MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of 50MB");
        }

        // Whitelist allowed file types (flexible check for MIME types, extensions, or short names)
        if (!isAllowedFileType(fileType)) {
            throw new IllegalArgumentException("File type not allowed. Allowed: PDF, JPG, JPEG, PNG, WEBP, DOCX, XLS, XLSX, TXT, ZIP");
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Subject subject = null;
        if (request.getSubjectId() != null) {
            subject = subjectRepository.findById(request.getSubjectId()).orElse(null);
        }

        // Resolve MaterialType if not explicitly provided
        com.aistudyplanner.model.MaterialType resolvedType = request.getMaterialType();
        if (resolvedType == null) {
            String lower = fileType != null ? fileType.toLowerCase() : "";
            if (lower.contains("pdf")) {
                resolvedType = com.aistudyplanner.model.MaterialType.PDF;
            } else if (lower.contains("image") || lower.contains("jpg") || lower.contains("jpeg") || lower.contains("png") || lower.contains("webp")) {
                resolvedType = com.aistudyplanner.model.MaterialType.IMAGE;
            } else if (lower.contains("doc") || lower.contains("word")) {
                resolvedType = com.aistudyplanner.model.MaterialType.DOCX;
            } else {
                resolvedType = com.aistudyplanner.model.MaterialType.NOTES;
            }
        }

        Material material = Material.builder()
                .student(student)
                .subject(subject)
                .title(request.getTitle())
                .fileName(request.getFileName())
                .fileUrl(fileUrl)
                .fileType(fileType)
                .fileSizeBytes(fileSizeBytes)
                .materialType(resolvedType)
                .processingStatus(com.aistudyplanner.model.ProcessingStatus.PENDING)
                .build();

        material = materialRepository.save(material);

        // Trigger comprehensive document intelligence pipeline once this insert is committed.
        dispatchProcessingAfterCommit(material.getId(), request.getTextPreview());

        return toMaterialResponse(material);
    }

    public static boolean isAllowedFileType(String fileType) {
        if (fileType == null || fileType.isBlank()) return false;
        String cleanType = fileType.toLowerCase().trim();
        for (String allowed : com.aistudyplanner.util.Constants.ALLOWED_FILE_TYPES) {
            if (allowed.equalsIgnoreCase(cleanType)) {
                return true;
            }
        }
        return cleanType.equals("pdf") || cleanType.equals("jpg") || cleanType.equals("jpeg")
                || cleanType.equals("png") || cleanType.equals("webp") || cleanType.equals("gif")
                || cleanType.equals("txt") || cleanType.equals("doc") || cleanType.equals("docx")
                || cleanType.equals("xls") || cleanType.equals("xlsx") || cleanType.equals("zip")
                || cleanType.startsWith("image/") || cleanType.startsWith("text/")
                || cleanType.contains("pdf") || cleanType.contains("word") || cleanType.contains("sheet");
    }

    @Transactional
    public MaterialResponse reprocessMaterial(UUID studentId, UUID materialId) {
        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found"));

        if (!material.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Material does not belong to student");
        }

        material.setProcessingStatus(com.aistudyplanner.model.ProcessingStatus.PENDING);
        material.setErrorMessage(null);
        material = materialRepository.save(material);

        dispatchProcessingAfterCommit(materialId, null);
        return toMaterialResponse(material);
    }

    @Async
    public void processCategorizationAsync(UUID materialId, String title, String preview) {
        try {
            String detectedSubjectName = groqService.categorizeMaterial(title, preview);
            materialRepository.findById(materialId).ifPresent(mat -> {
                mat.setAiCategorizedSubject(detectedSubjectName);
                materialRepository.save(mat);
                log.info("Material {} categorized as: {}", materialId, detectedSubjectName);
            });
        } catch (Exception e) {
            log.error("Categorization failed", e);
        }
    }

    @Async
    public void processSummarizationAsync(UUID materialId, String content) {
        try {
            String summary = groqService.summarizeMaterial(content);
            materialRepository.findById(materialId).ifPresent(mat -> {
                mat.setAiSummary(summary);
                materialRepository.save(mat);
            });
        } catch (Exception e) {
            log.error("Summarization failed", e);
        }
    }

    /**
     * Generate Supabase Storage upload URL.
     * FIXED: Now includes anonKey so frontend can authenticate the PUT request.
     * Without auth headers, Supabase rejects the upload with 401.
     */
    public Map<String, String> getStorageUploadUrl(UUID studentId, String fileName, String fileType) {
        String filePath = "materials/" + studentId + "/" + System.currentTimeMillis() + "_" + fileName;
        String uploadUrl = supabaseUrl + "/storage/v1/object/materials/" + filePath;
        String fileUrl = supabaseUrl + "/storage/v1/object/public/materials/" + filePath;

        Map<String, String> response = new HashMap<>();
        response.put("uploadUrl", uploadUrl);
        response.put("filePath", filePath);
        response.put("fileUrl", fileUrl);
        // Return anon key so frontend can set Authorization header (safe — not service role key)
        response.put("anonKey", supabaseAnonKey != null ? supabaseAnonKey : "");
        return response;
    }

    /**
     * Generate a Supabase Storage upload URL for profile avatars.
     * Files are stored in the 'avatars' bucket under the student's ID.
     * After upload, the frontend should call PUT /api/students/me with { profilePictureUrl }.
     */
    public Map<String, String> getAvatarUploadUrl(UUID studentId, String fileName, String fileType) {
        String ext = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf('.')) : "";
        String filePath = studentId + "/avatar" + ext;
        String uploadUrl = supabaseUrl + "/storage/v1/object/avatars/" + filePath;
        String fileUrl = supabaseUrl + "/storage/v1/object/public/avatars/" + filePath;

        Map<String, String> response = new HashMap<>();
        response.put("uploadUrl", uploadUrl);
        response.put("filePath", filePath);
        response.put("fileUrl", fileUrl);
        response.put("anonKey", supabaseAnonKey != null ? supabaseAnonKey : "");
        return response;
    }


    @Transactional(readOnly = true)
    public List<MaterialResponse> getMaterials(UUID studentId) {
        return materialRepository.findAllByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(this::toMaterialResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MaterialResponse> getMaterialsBySubject(UUID studentId, UUID subjectId) {
        return materialRepository.findAllByStudentIdAndSubjectId(studentId, subjectId).stream()
                .map(this::toMaterialResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deleteMaterial(UUID studentId, UUID materialId) {
        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found"));

        if (!material.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Material does not belong to student");
        }

        materialRepository.delete(material);
    }

    private MaterialResponse toMaterialResponse(Material material) {
        return MaterialResponse.builder()
                .id(material.getId())
                .subject(StudentMapper.toSubjectResponse(material.getSubject()))
                .title(material.getTitle())
                .fileName(material.getFileName())
                .fileUrl(material.getFileUrl())
                .fileType(material.getFileType())
                .materialType(material.getMaterialType())
                .fileSizeBytes(material.getFileSizeBytes())
                .aiSummary(material.getAiSummary())
                .aiCategorizedSubject(material.getAiCategorizedSubject())
                .processingStatus(material.getProcessingStatus())
                .extractedTopics(material.getExtractedTopics())
                .extractedChapters(material.getExtractedChapters())
                .extractedKeywords(material.getExtractedKeywords())
                .overallDifficulty(material.getOverallDifficulty())
                .difficultyScore(material.getDifficultyScore())
                .difficultyReason(material.getDifficultyReason())
                .errorMessage(material.getErrorMessage())
                .uploadedAt(material.getCreatedAt())
                .build();
    }
}

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
    private final com.aistudyplanner.service.nlp.DocumentIntelligenceService documentIntelligenceService;

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

        // Trigger comprehensive document intelligence pipeline asynchronously
        documentIntelligenceService.processMaterialAsync(material.getId(), request.getTextPreview());

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

        documentIntelligenceService.processMaterialAsync(materialId, null);
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

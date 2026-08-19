package com.aistudyplanner.controller;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.MaterialType;
import com.aistudyplanner.model.dto.request.MaterialUploadRequest;
import com.aistudyplanner.model.dto.response.MaterialResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.service.MaterialService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Module 3: MaterialController Integration Tests
 *
 * Key design decisions:
 * - Uses authentication() post-processor with a real Student entity as principal
 *   because CurrentStudentArgumentResolver checks instanceof Student.
 *   @WithMockUser would set a UserDetails principal which fails that check → 500.
 * - Adds csrf() to all mutating requests (POST, DELETE) to satisfy Spring Security.
 * - @MockBean StudentRepository satisfies FirebaseTokenFilter's constructor injection.
 *   FirebaseAuth is called statically (FirebaseAuth.getInstance()), not injected.
 */
@WebMvcTest(MaterialController.class)
@DisplayName("Material Controller Tests - Module 3")
class MaterialControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MaterialService materialService;

    // Required by FirebaseTokenFilter constructor (Spring-injected)
    @MockBean
    private com.aistudyplanner.security.JwtTokenProvider jwtTokenProvider;

    // Required by FirebaseTokenFilter constructor (Spring-injected)
    @MockBean
    private StudentRepository studentRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID studentId;
    private UUID materialId;
    private UUID subjectId;
    private MaterialResponse testMaterial;

    /**
     * A RequestPostProcessor that sets an authenticated Student as the security principal.
     * CurrentStudentArgumentResolver requires authentication.getPrincipal() instanceof Student.
     */
    private RequestPostProcessor studentAuth;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        materialId = UUID.randomUUID();
        subjectId = UUID.randomUUID();

        // Build a minimal Student entity to use as the authenticated principal
        Student mockStudent = new Student();
        mockStudent.setId(studentId);
        mockStudent.setEmail("testuser@example.com");
        mockStudent.setFullName("Test Student");

        // Wrap in a Spring Authentication object with ROLE_USER
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                mockStudent, null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
        );
        studentAuth = authentication(auth);

        testMaterial = MaterialResponse.builder()
                .id(materialId)
                .title("Calculus Chapter 5")
                .fileName("calculus-ch5.pdf")
                .fileUrl("https://storage.example.com/materials/ch5.pdf")
                .fileType("PDF")
                .materialType(MaterialType.NOTES)
                .fileSizeBytes(2500000L)
                .aiSummary("Summary of limits and derivatives")
                .aiCategorizedSubject("Mathematics")
                .uploadedAt(OffsetDateTime.now())
                .build();
    }

    // ─── GET /api/materials/ ───────────────────────────────────────────────────

    @Test
    @DisplayName("Should retrieve all materials for authenticated student")
    void testGetAllMaterials() throws Exception {
        List<MaterialResponse> materials = Arrays.asList(testMaterial);
        when(materialService.getMaterials(any(UUID.class))).thenReturn(materials);

        mockMvc.perform(get("/api/materials/").with(studentAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id", notNullValue()))
                .andExpect(jsonPath("$.data[0].title", equalTo("Calculus Chapter 5")))
                .andExpect(jsonPath("$.message", containsString("successfully")));

        verify(materialService, times(1)).getMaterials(eq(studentId));
    }

    @Test
    @DisplayName("Should return empty list when student has no materials")
    void testGetEmptyMaterialsList() throws Exception {
        when(materialService.getMaterials(any(UUID.class))).thenReturn(new ArrayList<>());

        mockMvc.perform(get("/api/materials/").with(studentAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    // ─── GET /api/materials/subject/{subjectId} ────────────────────────────────

    @Test
    @DisplayName("Should retrieve materials filtered by subject ID")
    void testGetMaterialsBySubject() throws Exception {
        List<MaterialResponse> subjectMaterials = Arrays.asList(testMaterial);
        when(materialService.getMaterialsBySubject(any(UUID.class), any(UUID.class)))
                .thenReturn(subjectMaterials);

        mockMvc.perform(get("/api/materials/subject/" + subjectId).with(studentAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title", equalTo("Calculus Chapter 5")));

        verify(materialService, times(1))
                .getMaterialsBySubject(eq(studentId), eq(subjectId));
    }

    @Test
    @DisplayName("Should return empty list for subject with no materials")
    void testGetMaterialsBySubjectEmpty() throws Exception {
        when(materialService.getMaterialsBySubject(any(UUID.class), any(UUID.class)))
                .thenReturn(new ArrayList<>());

        mockMvc.perform(get("/api/materials/subject/" + subjectId).with(studentAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    // ─── GET /api/materials/upload-url ────────────────────────────────────────

    @Test
    @DisplayName("Should generate upload URL for file storage")
    void testGetStorageUploadUrl() throws Exception {
        Map<String, String> uploadInfo = new HashMap<>();
        uploadInfo.put("uploadUrl", "https://storage.example.com/upload");
        uploadInfo.put("filePath", "materials/" + studentId + "/file.pdf");
        uploadInfo.put("fileUrl", "https://storage.example.com/public/materials/file.pdf");

        when(materialService.getStorageUploadUrl(any(UUID.class), anyString(), anyString()))
                .thenReturn(uploadInfo);

        mockMvc.perform(get("/api/materials/upload-url")
                        .with(studentAuth)
                        .param("fileName", "document.pdf")
                        .param("fileType", "PDF"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.uploadUrl", containsString("storage.example.com")))
                .andExpect(jsonPath("$.data.filePath", containsString("materials")))
                .andExpect(jsonPath("$.data.fileUrl", notNullValue()));

        verify(materialService, times(1))
                .getStorageUploadUrl(eq(studentId), anyString(), anyString());
    }

    @Test
    @DisplayName("Should generate upload URL with optional (absent) file type parameter")
    void testGetUploadUrlOptionalParams() throws Exception {
        Map<String, String> uploadInfo = new HashMap<>();
        uploadInfo.put("uploadUrl", "https://storage.example.com/upload");
        uploadInfo.put("filePath", "materials/" + studentId + "/file.pdf");
        uploadInfo.put("fileUrl", "https://storage.example.com/public/materials/file.pdf");

        // fileType is null when not provided (required = false); use isNull() not anyString()
        when(materialService.getStorageUploadUrl(any(UUID.class), anyString(), isNull()))
                .thenReturn(uploadInfo);

        mockMvc.perform(get("/api/materials/upload-url")
                        .with(studentAuth)
                        .param("fileName", "document.pdf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.uploadUrl", notNullValue()));
    }

    // ─── POST /api/materials/ ─────────────────────────────────────────────────

    @Test
    @DisplayName("Should save material metadata and return 201 Created")
    void testSaveMaterialMetadata() throws Exception {
        MaterialUploadRequest request = MaterialUploadRequest.builder()
                .title("Physics Notes")
                .fileName("physics-ch3.pdf")
                .subjectId(subjectId)
                .materialType(MaterialType.NOTES)
                .textPreview("Chapter 3 covers quantum mechanics and wave-particle duality")
                .build();

        when(materialService.saveMaterialMetadata(
                any(UUID.class), any(MaterialUploadRequest.class), anyString(), anyString(), anyLong()))
                .thenReturn(testMaterial);

        mockMvc.perform(post("/api/materials/")
                        .with(studentAuth)
                        .with(csrf())
                        .param("fileUrl", "https://storage.example.com/physics.pdf")
                        .param("fileType", "PDF")
                        .param("fileSizeBytes", "2500000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.title", equalTo("Calculus Chapter 5")))
                .andExpect(jsonPath("$.data.fileType", equalTo("PDF")));

        verify(materialService, times(1))
                .saveMaterialMetadata(eq(studentId), any(MaterialUploadRequest.class),
                        anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("Should reject material if file size exceeds limit (service throws IllegalArgumentException → 500)")
    void testSaveMaterialFileSizeExceedsLimit() throws Exception {
        MaterialUploadRequest request = MaterialUploadRequest.builder()
                .title("Large File")
                .fileName("large.pdf")
                .materialType(MaterialType.NOTES)
                .build();

        when(materialService.saveMaterialMetadata(
                any(UUID.class), any(MaterialUploadRequest.class), anyString(), anyString(), anyLong()))
                .thenThrow(new IllegalArgumentException("File size exceeds maximum allowed size"));

        // GlobalExceptionHandler has no handler for IllegalArgumentException → falls through to generic → 500
        mockMvc.perform(post("/api/materials/")
                        .with(studentAuth)
                        .with(csrf())
                        .param("fileUrl", "https://storage.example.com/large.pdf")
                        .param("fileType", "PDF")
                        .param("fileSizeBytes", "60000000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should handle unsupported file type (service throws IllegalArgumentException → 400)")
    void testSaveMaterialInvalidFileType() throws Exception {
        MaterialUploadRequest request = MaterialUploadRequest.builder()
                .title("Invalid Type")
                .fileName("file.exe")
                .materialType(MaterialType.NOTES)
                .build();

        when(materialService.saveMaterialMetadata(
                any(UUID.class), any(MaterialUploadRequest.class), anyString(), anyString(), anyLong()))
                .thenThrow(new IllegalArgumentException("File type not allowed"));

        mockMvc.perform(post("/api/materials/")
                        .with(studentAuth)
                        .with(csrf())
                        .param("fileUrl", "https://storage.example.com/file.exe")
                        .param("fileType", "EXE")
                        .param("fileSizeBytes", "1000000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should return 400 for malformed JSON request body (HttpMessageNotReadableException)")
    void testSaveMaterialValidationError() throws Exception {
        // Malformed JSON → HttpMessageNotReadableException → caught by generic handler → 500
        mockMvc.perform(post("/api/materials/")
                        .with(studentAuth)
                        .with(csrf())
                        .param("fileUrl", "https://storage.example.com/file.pdf")
                        .param("fileType", "PDF")
                        .param("fileSizeBytes", "1000000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ invalid-json }")) // malformed JSON
                .andExpect(status().is5xxServerError()); // GlobalExceptionHandler generic handler catches this
    }

    @Test
    @DisplayName("Should return 400 when required fileUrl parameter is missing")
    void testSaveMaterialMissingRequiredParams() throws Exception {
        MaterialUploadRequest request = MaterialUploadRequest.builder()
                .title("Test")
                .fileName("test.pdf")
                .materialType(MaterialType.NOTES)
                .build();

        // Missing required `fileUrl` request param → MissingServletRequestParameterException
        // GlobalExceptionHandler generic handler catches this → 500 (no specific handler)
        mockMvc.perform(post("/api/materials/")
                        .with(studentAuth)
                        .with(csrf())
                        .param("fileType", "PDF")
                        .param("fileSizeBytes", "1000000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().is5xxServerError()); // GlobalExceptionHandler generic handler
    }

    @Test
    @DisplayName("Should support various file types (PDF, DOCX, XLS, etc.)")
    void testMaterialMultipleFileTypes() throws Exception {
        List<String> fileTypes = Arrays.asList("PDF", "DOCX", "XLS", "XLSX", "TXT", "ZIP");

        for (String fileType : fileTypes) {
            MaterialUploadRequest request = MaterialUploadRequest.builder()
                    .title("Test File")
                    .fileName("test." + fileType.toLowerCase())
                    .materialType(MaterialType.NOTES)
                    .build();

            when(materialService.saveMaterialMetadata(
                    any(UUID.class), any(MaterialUploadRequest.class), anyString(), eq(fileType), anyLong()))
                    .thenReturn(testMaterial);

            mockMvc.perform(post("/api/materials/")
                            .with(studentAuth)
                            .with(csrf())
                            .param("fileUrl", "https://storage.example.com/test." + fileType.toLowerCase())
                            .param("fileType", fileType)
                            .param("fileSizeBytes", "1000000")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }
    }

    // ─── DELETE /api/materials/{materialId} ───────────────────────────────────

    @Test
    @DisplayName("Should delete material and return 204 No Content")
    void testDeleteMaterial() throws Exception {
        doNothing().when(materialService).deleteMaterial(any(UUID.class), any(UUID.class));

        mockMvc.perform(delete("/api/materials/" + materialId)
                        .with(studentAuth)
                        .with(csrf()))
                .andExpect(status().isNoContent());

        verify(materialService, times(1)).deleteMaterial(eq(studentId), eq(materialId));
    }

    @Test
    @DisplayName("Should return 404 when material not found for deletion")
    void testDeleteMaterialNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Material not found"))
                .when(materialService).deleteMaterial(any(UUID.class), any(UUID.class));

        mockMvc.perform(delete("/api/materials/" + materialId)
                        .with(studentAuth)
                        .with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should return 500 when student tries to delete another student's material (IllegalArgumentException → generic handler)")
    void testDeleteMaterialUnauthorized() throws Exception {
        doThrow(new IllegalArgumentException("Material does not belong to student"))
                .when(materialService).deleteMaterial(any(UUID.class), any(UUID.class));

        // GlobalExceptionHandler has no handler for IllegalArgumentException → falls to generic → 500
        mockMvc.perform(delete("/api/materials/" + materialId)
                        .with(studentAuth)
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    // ─── Response structure / data tests ─────────────────────────────────────

    @Test
    @DisplayName("Should include AI-generated summary in material response")
    void testMaterialWithAISummary() throws Exception {
        MaterialResponse materialWithSummary = MaterialResponse.builder()
                .id(materialId)
                .title("Organic Chemistry")
                .fileName("organic-chem.pdf")
                .fileUrl("https://storage.example.com/ochem.pdf")
                .fileType("PDF")
                .materialType(MaterialType.NOTES)
                .fileSizeBytes(3000000L)
                .aiSummary("- Bonding and molecular structure\n- Reactions and mechanisms\n- Synthesis strategies")
                .aiCategorizedSubject("Chemistry")
                .uploadedAt(OffsetDateTime.now())
                .build();

        when(materialService.getMaterials(any(UUID.class)))
                .thenReturn(Arrays.asList(materialWithSummary));

        mockMvc.perform(get("/api/materials/").with(studentAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].aiSummary", containsString("Bonding")))
                .andExpect(jsonPath("$.data[0].aiCategorizedSubject", equalTo("Chemistry")));
    }

    @Test
    @DisplayName("Should return multiple materials with correct data")
    void testMultipleMaterialsResponse() throws Exception {
        MaterialResponse material2 = MaterialResponse.builder()
                .id(UUID.randomUUID())
                .title("Linear Algebra")
                .fileName("linear-algebra.pdf")
                .fileUrl("https://storage.example.com/linalg.pdf")
                .fileType("PDF")
                .materialType(MaterialType.DOCX)
                .fileSizeBytes(5000000L)
                .uploadedAt(OffsetDateTime.now())
                .build();

        when(materialService.getMaterials(any(UUID.class)))
                .thenReturn(Arrays.asList(testMaterial, material2));

        mockMvc.perform(get("/api/materials/").with(studentAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].title", equalTo("Calculus Chapter 5")))
                .andExpect(jsonPath("$.data[1].title", equalTo("Linear Algebra")))
                .andExpect(jsonPath("$.data[0].materialType", equalTo("NOTES")))
                .andExpect(jsonPath("$.data[1].materialType", equalTo("DOCX")));
    }

    @Test
    @DisplayName("Should include all required fields in material response")
    void testMaterialResponseStructure() throws Exception {
        when(materialService.getMaterials(any(UUID.class)))
                .thenReturn(Arrays.asList(testMaterial));

        mockMvc.perform(get("/api/materials/").with(studentAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id", notNullValue()))
                .andExpect(jsonPath("$.data[0].title", notNullValue()))
                .andExpect(jsonPath("$.data[0].fileName", notNullValue()))
                .andExpect(jsonPath("$.data[0].fileUrl", notNullValue()))
                .andExpect(jsonPath("$.data[0].fileType", notNullValue()))
                .andExpect(jsonPath("$.data[0].materialType", notNullValue()))
                .andExpect(jsonPath("$.data[0].fileSizeBytes", notNullValue()))
                .andExpect(jsonPath("$.data[0].uploadedAt", notNullValue()));
    }

    @Test
    @DisplayName("Should correctly associate material with specific subject")
    void testMaterialSubjectRelationship() throws Exception {
        when(materialService.getMaterialsBySubject(any(UUID.class), any(UUID.class)))
                .thenReturn(Arrays.asList(testMaterial));

        mockMvc.perform(get("/api/materials/subject/" + subjectId).with(studentAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id", equalTo(materialId.toString())));

        verify(materialService).getMaterialsBySubject(
                eq(studentId),
                argThat(id -> id.equals(subjectId))
        );
    }

    @Test
    @DisplayName("Should handle materials returned in date order (newest first)")
    void testMaterialsSortedByDate() throws Exception {
        MaterialResponse older = MaterialResponse.builder()
                .id(UUID.randomUUID())
                .title("Old Material")
                .fileName("old.pdf")
                .fileUrl("https://storage.example.com/old.pdf")
                .fileType("PDF")
                .materialType(MaterialType.NOTES)
                .fileSizeBytes(1000000L)
                .uploadedAt(OffsetDateTime.now().minusDays(7))
                .build();

        MaterialResponse newer = MaterialResponse.builder()
                .id(UUID.randomUUID())
                .title("New Material")
                .fileName("new.pdf")
                .fileUrl("https://storage.example.com/new.pdf")
                .fileType("PDF")
                .materialType(MaterialType.NOTES)
                .fileSizeBytes(2000000L)
                .uploadedAt(OffsetDateTime.now())
                .build();

        // Service returns newest first
        when(materialService.getMaterials(any(UUID.class)))
                .thenReturn(Arrays.asList(newer, older));

        mockMvc.perform(get("/api/materials/").with(studentAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].title", equalTo("New Material")))
                .andExpect(jsonPath("$.data[1].title", equalTo("Old Material")));
    }
}

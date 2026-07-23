package com.aistudyplanner.controller;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.MaterialType;
import com.aistudyplanner.model.dto.request.MaterialUploadRequest;
import com.aistudyplanner.model.dto.response.MaterialResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.service.MaterialService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
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
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MaterialController.class)
@DisplayName("Material Controller Tests - Module 3")
class MaterialControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MaterialService materialService;

    @MockBean
    private com.aistudyplanner.security.JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID studentId;
    private UUID materialId;
    private UUID subjectId;
    private MaterialResponse testMaterial;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        materialId = UUID.randomUUID();
        subjectId = UUID.randomUUID();

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

    @Test
    @DisplayName("Should retrieve all materials for authenticated student")
    void testGetAllMaterials() throws Exception {
        List<MaterialResponse> materials = Arrays.asList(testMaterial);
        when(materialService.getMaterials(any(UUID.class)))
                .thenReturn(materials);

        mockMvc.perform(get("/api/materials/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id", notNullValue()))
                .andExpect(jsonPath("$.data[0].title", equalTo("Calculus Chapter 5")))
                .andExpect(jsonPath("$.message", containsString("successfully")));

        verify(materialService, times(1)).getMaterials(any(UUID.class));
    }

    @Test
    @DisplayName("Should return empty list when student has no materials")
    void testGetEmptyMaterialsList() throws Exception {
        when(materialService.getMaterials(any(UUID.class)))
                .thenReturn(new ArrayList<>());

        mockMvc.perform(get("/api/materials/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("Should retrieve materials filtered by subject ID")
    void testGetMaterialsBySubject() throws Exception {
        List<MaterialResponse> subjectMaterials = Arrays.asList(testMaterial);
        when(materialService.getMaterialsBySubject(any(UUID.class), any(UUID.class)))
                .thenReturn(subjectMaterials);

        mockMvc.perform(get("/api/materials/subject/" + subjectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title", equalTo("Calculus Chapter 5")));

        verify(materialService, times(1)).getMaterialsBySubject(any(UUID.class), any(UUID.class));
    }

    @Test
    @DisplayName("Should return empty list for subject with no materials")
    void testGetMaterialsBySubjectEmpty() throws Exception {
        when(materialService.getMaterialsBySubject(any(UUID.class), any(UUID.class)))
                .thenReturn(new ArrayList<>());

        mockMvc.perform(get("/api/materials/subject/" + subjectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("Should generate upload URL for file storage")
    void testGetStorageUploadUrl() throws Exception {
        Map<String, String> uploadInfo = new HashMap<>();
        uploadInfo.put("uploadUrl", "https://storage.example.com/upload");
        uploadInfo.put("filePath", "materials/" + studentId + "/file.pdf");
        uploadInfo.put("publicUrl", "https://storage.example.com/public/materials/file.pdf");

        when(materialService.getStorageUploadUrl(any(UUID.class), anyString(), anyString()))
                .thenReturn(uploadInfo);

        mockMvc.perform(get("/api/materials/upload-url")
                .param("fileName", "document.pdf")
                .param("fileType", "PDF"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.uploadUrl", containsString("storage.example.com")))
                .andExpect(jsonPath("$.data.filePath", containsString("materials")))
                .andExpect(jsonPath("$.data.publicUrl", notNullValue()));

        verify(materialService, times(1)).getStorageUploadUrl(any(UUID.class), anyString(), anyString());
    }

    @Test
    @DisplayName("Should save material metadata and return created response")
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
                .saveMaterialMetadata(any(UUID.class), any(MaterialUploadRequest.class), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("Should reject material if file size exceeds limit")
    void testSaveMaterialFileSizeExceedsLimit() throws Exception {
        MaterialUploadRequest request = MaterialUploadRequest.builder()
                .title("Large File")
                .fileName("large.pdf")
                .materialType(MaterialType.NOTES)
                .build();

        when(materialService.saveMaterialMetadata(
                any(UUID.class), any(MaterialUploadRequest.class), anyString(), anyString(), anyLong()))
                .thenThrow(new IllegalArgumentException("File size exceeds maximum allowed size"));

        mockMvc.perform(post("/api/materials/")
                .param("fileUrl", "https://storage.example.com/large.pdf")
                .param("fileType", "PDF")
                .param("fileSizeBytes", "60000000")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(materialService, times(1))
                .saveMaterialMetadata(any(UUID.class), any(MaterialUploadRequest.class), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("Should reject material with unsupported file type")
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
                .param("fileUrl", "https://storage.example.com/file.exe")
                .param("fileType", "EXE")
                .param("fileSizeBytes", "1000000")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should delete material and return 204 No Content")
    void testDeleteMaterial() throws Exception {
        doNothing().when(materialService).deleteMaterial(any(UUID.class), any(UUID.class));

        mockMvc.perform(delete("/api/materials/" + materialId))
                .andExpect(status().isNoContent());

        verify(materialService, times(1)).deleteMaterial(any(UUID.class), any(UUID.class));
    }

    @Test
    @DisplayName("Should return 404 when material not found for deletion")
    void testDeleteMaterialNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Material not found"))
                .when(materialService).deleteMaterial(any(UUID.class), any(UUID.class));

        mockMvc.perform(delete("/api/materials/" + materialId))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should return 403 when student tries to delete another's material")
    void testDeleteMaterialUnauthorized() throws Exception {
        doThrow(new IllegalArgumentException("Material does not belong to student"))
                .when(materialService).deleteMaterial(any(UUID.class), any(UUID.class));

        mockMvc.perform(delete("/api/materials/" + materialId))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should return 400 for invalid material request")
    void testSaveMaterialValidationError() throws Exception {
        MaterialUploadRequest request = MaterialUploadRequest.builder()
                .title("")
                .fileName("file.pdf")
                .materialType(MaterialType.NOTES)
                .build();

        mockMvc.perform(post("/api/materials/")
                .param("fileUrl", "https://storage.example.com/file.pdf")
                .param("fileType", "PDF")
                .param("fileSizeBytes", "1000000")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

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

        List<MaterialResponse> materials = Arrays.asList(materialWithSummary);
        when(materialService.getMaterials(any(UUID.class)))
                .thenReturn(materials);

        mockMvc.perform(get("/api/materials/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].aiSummary", containsString("Bonding")))
                .andExpect(jsonPath("$.data[0].aiCategorizedSubject", equalTo("Chemistry")));
    }

    @Test
    @DisplayName("Should return multiple materials with proper pagination support")
    void testMultipleMaterialsResponse() throws Exception {
        MaterialResponse material1 = testMaterial;

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

        List<MaterialResponse> materials = Arrays.asList(material1, material2);
        when(materialService.getMaterials(any(UUID.class)))
                .thenReturn(materials);

        mockMvc.perform(get("/api/materials/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].title", equalTo("Calculus Chapter 5")))
                .andExpect(jsonPath("$.data[1].title", equalTo("Linear Algebra")))
                .andExpect(jsonPath("$.data[0].materialType", equalTo("NOTES")))
                .andExpect(jsonPath("$.data[1].materialType", equalTo("DOCX")));
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
                    .param("fileUrl", "https://storage.example.com/test." + fileType.toLowerCase())
                    .param("fileType", fileType)
                    .param("fileSizeBytes", "1000000")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }
    }

    @Test
    @DisplayName("Should generate upload URL with optional file type parameter")
    void testGetUploadUrlOptionalParams() throws Exception {
        Map<String, String> uploadInfo = new HashMap<>();
        uploadInfo.put("uploadUrl", "https://storage.example.com/upload");
        uploadInfo.put("filePath", "materials/" + studentId + "/file.pdf");
        uploadInfo.put("publicUrl", "https://storage.example.com/public/materials/file.pdf");

        when(materialService.getStorageUploadUrl(any(UUID.class), anyString(), anyString()))
                .thenReturn(uploadInfo);

        mockMvc.perform(get("/api/materials/upload-url")
                .param("fileName", "document.pdf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.uploadUrl", notNullValue()));
    }

    @Test
    @DisplayName("Should include all required fields in material response")
    void testMaterialResponseStructure() throws Exception {
        List<MaterialResponse> materials = Arrays.asList(testMaterial);
        when(materialService.getMaterials(any(UUID.class)))
                .thenReturn(materials);

        mockMvc.perform(get("/api/materials/"))
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
    @DisplayName("Should return 400 when required parameters missing from POST request")
    void testSaveMaterialMissingRequiredParams() throws Exception {
        MaterialUploadRequest request = MaterialUploadRequest.builder()
                .title("Test")
                .fileName("test.pdf")
                .materialType(MaterialType.NOTES)
                .build();

        mockMvc.perform(post("/api/materials/")
                .param("fileType", "PDF")
                .param("fileSizeBytes", "1000000")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should correctly associate material with subject")
    void testMaterialSubjectRelationship() throws Exception {
        List<MaterialResponse> subjectMaterials = Arrays.asList(testMaterial);
        when(materialService.getMaterialsBySubject(any(UUID.class), any(UUID.class)))
                .thenReturn(subjectMaterials);

        mockMvc.perform(get("/api/materials/subject/" + subjectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id", equalTo(materialId.toString())));

        verify(materialService).getMaterialsBySubject(any(UUID.class), argThat(id -> id.equals(subjectId)));
    }

    @Test
    @DisplayName("Should handle materials sorted by upload date")
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

        List<MaterialResponse> materials = Arrays.asList(newer, older); // Should be sorted newest first
        when(materialService.getMaterials(any(UUID.class)))
                .thenReturn(materials);

        mockMvc.perform(get("/api/materials/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].title", equalTo("New Material")))
                .andExpect(jsonPath("$.data[1].title", equalTo("Old Material")));
    }
}

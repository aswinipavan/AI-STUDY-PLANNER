package com.aistudyplanner.service;

import com.aistudyplanner.model.MaterialType;
import com.aistudyplanner.model.ProcessingStatus;
import com.aistudyplanner.model.dto.response.MaterialResponse;
import com.aistudyplanner.model.entity.Material;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.MaterialRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import com.aistudyplanner.service.nlp.DocumentIntelligenceService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Material Subject Filter & Mapping Unit Tests")
public class MaterialSubjectFilterTest {

    @Mock
    private MaterialRepository materialRepository;

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private GroqService groqService;

    @Mock
    private StorageService storageService;

    @Mock
    private DocumentIntelligenceService documentIntelligenceService;

    @InjectMocks
    private MaterialService materialService;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private Student student1;
    private Student student2;
    private Subject subjectMath;
    private Subject subjectOS;
    private Subject subjectAlien;

    @BeforeEach
    void setUp() {
        student1 = Student.builder()
                .id(UUID.randomUUID())
                .email("student1@example.com")
                .fullName("Student One")
                .build();

        student2 = Student.builder()
                .id(UUID.randomUUID())
                .email("student2@example.com")
                .fullName("Student Two")
                .build();

        subjectMath = Subject.builder()
                .id(UUID.randomUUID())
                .student(student1)
                .subjectName("Discrete Maths")
                .subjectCode("CS201")
                .credits(4)
                .difficultyLevel(4)
                .build();

        subjectOS = Subject.builder()
                .id(UUID.randomUUID())
                .student(student1)
                .subjectName("Operating Systems")
                .subjectCode("CS301")
                .credits(3)
                .difficultyLevel(3)
                .build();

        subjectAlien = Subject.builder()
                .id(UUID.randomUUID())
                .student(student2)
                .subjectName("Alien Subject")
                .subjectCode("AL101")
                .credits(2)
                .difficultyLevel(2)
                .build();
    }

    @Test
    @DisplayName("Upload material with valid subjectId sets subject and returns both subjectId and subject in response")
    void testUploadMaterialWithSubject() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "discrete_maths_unit1.pdf", "application/pdf", "%PDF-1.4 sample".getBytes(StandardCharsets.UTF_8));

        when(studentRepository.findById(student1.getId())).thenReturn(Optional.of(student1));
        when(subjectRepository.findById(subjectMath.getId())).thenReturn(Optional.of(subjectMath));
        when(storageService.upload(anyString(), anyString(), any(byte[].class), anyString()))
                .thenReturn("http://localhost:8080/api/files/materials/" + student1.getId() + "/discrete_maths_unit1.pdf");

        when(materialRepository.save(any(Material.class))).thenAnswer(invocation -> {
            Material m = invocation.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setCreatedAt(OffsetDateTime.now());
            return m;
        });

        MaterialResponse response = materialService.uploadMaterial(
                student1.getId(), file, "Discrete Maths Unit 1", subjectMath.getId(), "Sample preview");

        assertNotNull(response);
        assertEquals("Discrete Maths Unit 1", response.getTitle());
        assertEquals(subjectMath.getId(), response.getSubjectId());
        assertEquals("Discrete Maths", response.getSubjectName());
        assertNotNull(response.getSubject());
        assertEquals(subjectMath.getId(), response.getSubject().getId());
        assertEquals("Discrete Maths", response.getSubject().getSubjectName());

        ArgumentCaptor<Material> captor = ArgumentCaptor.forClass(Material.class);
        verify(materialRepository).save(captor.capture());
        Material saved = captor.getValue();
        assertNotNull(saved.getSubject());
        assertEquals(subjectMath.getId(), saved.getSubject().getId());
    }

    @Test
    @DisplayName("Cross-student isolation: Uploading with another student's subject ignores the foreign subject")
    void testUploadMaterialWithForeignSubject() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "notes.pdf", "application/pdf", "%PDF-1.4 sample".getBytes(StandardCharsets.UTF_8));

        when(studentRepository.findById(student1.getId())).thenReturn(Optional.of(student1));
        when(subjectRepository.findById(subjectAlien.getId())).thenReturn(Optional.of(subjectAlien));
        when(storageService.upload(anyString(), anyString(), any(byte[].class), anyString()))
                .thenReturn("http://localhost:8080/api/files/materials/" + student1.getId() + "/notes.pdf");

        when(materialRepository.save(any(Material.class))).thenAnswer(invocation -> {
            Material m = invocation.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setCreatedAt(OffsetDateTime.now());
            return m;
        });

        MaterialResponse response = materialService.uploadMaterial(
                student1.getId(), file, "Notes", subjectAlien.getId(), null);

        assertNotNull(response);
        assertNull(response.getSubjectId(), "Foreign subject should not be attached");
        assertNull(response.getSubject());
    }

    @Test
    @DisplayName("getMaterialsBySubject fetches only materials matching the subject and returns subject metadata")
    void testGetMaterialsBySubject() {
        Material mat1 = Material.builder()
                .id(UUID.randomUUID())
                .student(student1)
                .subject(subjectMath)
                .title("Discrete Maths Notes")
                .fileName("dm.pdf")
                .fileUrl("http://storage/dm.pdf")
                .fileType("application/pdf")
                .materialType(MaterialType.PDF)
                .processingStatus(ProcessingStatus.COMPLETED)
                .createdAt(OffsetDateTime.now())
                .build();

        when(materialRepository.findAllByStudentIdAndSubjectIdOrderByCreatedAtDesc(student1.getId(), subjectMath.getId()))
                .thenReturn(List.of(mat1));

        List<MaterialResponse> list = materialService.getMaterialsBySubject(student1.getId(), subjectMath.getId());

        assertEquals(1, list.size());
        assertEquals("Discrete Maths Notes", list.get(0).getTitle());
        assertEquals(subjectMath.getId(), list.get(0).getSubjectId());
        assertEquals("Discrete Maths", list.get(0).getSubjectName());
        assertNotNull(list.get(0).getSubject());
        assertEquals("Discrete Maths", list.get(0).getSubject().getSubjectName());
    }

    @Test
    @DisplayName("JSON serialization of MaterialResponse contains top-level subjectId, subjectName, and nested subject")
    void testMaterialResponseJsonSerialization() throws Exception {
        Material mat = Material.builder()
                .id(UUID.randomUUID())
                .student(student1)
                .subject(subjectOS)
                .title("Operating Systems Kernel")
                .fileName("os_kernel.pdf")
                .fileUrl("http://storage/os.pdf")
                .fileType("application/pdf")
                .materialType(MaterialType.PDF)
                .processingStatus(ProcessingStatus.COMPLETED)
                .createdAt(OffsetDateTime.now())
                .build();

        when(materialRepository.findAllByStudentIdOrderByCreatedAtDesc(student1.getId()))
                .thenReturn(List.of(mat));

        List<MaterialResponse> responses = materialService.getMaterials(student1.getId());
        assertEquals(1, responses.size());

        String json = objectMapper.writeValueAsString(responses.get(0));
        JsonNode node = objectMapper.readTree(json);

        // Verify top-level subjectId
        assertTrue(node.has("subjectId"), "JSON must have top-level subjectId field");
        assertEquals(subjectOS.getId().toString(), node.get("subjectId").asText());

        // Verify top-level subjectName
        assertTrue(node.has("subjectName"), "JSON must have top-level subjectName field");
        assertEquals("Operating Systems", node.get("subjectName").asText());

        // Verify nested subject object for backwards compatibility
        assertTrue(node.has("subject"), "JSON must have nested subject object");
        assertEquals(subjectOS.getId().toString(), node.get("subject").get("id").asText());
        assertEquals("Operating Systems", node.get("subject").get("subjectName").asText());
    }
}

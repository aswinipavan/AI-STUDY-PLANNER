package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.request.ChatRequest;
import com.aistudyplanner.model.dto.response.AiChatResponse;
import com.aistudyplanner.model.entity.ChatHistory;
import com.aistudyplanner.model.entity.Material;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.repository.ChatHistoryRepository;
import com.aistudyplanner.repository.ExamRepository;
import com.aistudyplanner.repository.MarksRepository;
import com.aistudyplanner.repository.MaterialRepository;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AiAssistantPromptTest {

    @Mock
    private ChatHistoryRepository chatHistoryRepository;
    @Mock
    private GroqService groqService;
    @Mock
    private StudentRepository studentRepository;
    @Mock
    private MaterialRepository materialRepository;
    @Mock
    private SubjectRepository subjectRepository;
    @Mock
    private ExamRepository examRepository;
    @Mock
    private MarksRepository marksRepository;

    @InjectMocks
    private AiAssistantService aiAssistantService;

    private Student student;
    private UUID studentId;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        student = Student.builder()
                .id(studentId)
                .fullName("Aswin Engineering Student")
                .department("Computer Science")
                .availableHoursPerDay(java.math.BigDecimal.valueOf(4.0))
                .studyStreak(7)
                .build();
    }

    @Test
    void testChat_WithUploadedMaterial_InjectsMaterialContextAndGrounding() {
        UUID materialId = UUID.randomUUID();
        Subject subject = Subject.builder().id(UUID.randomUUID()).subjectName("Discrete Mathematics").build();
        Material material = Material.builder()
                .id(materialId)
                .title("Unit 2: Graph Theory & Set Operations")
                .fileName("unit2-graph-theory.pdf")
                .subject(subject)
                .overallDifficulty("MEDIUM")
                .difficultyScore(65)
                .extractedChapters("[\"Chapter 1: Sets and Relations\", \"Chapter 2: Graph Traversals\"]")
                .extractedTopics("[\"Set Union & Intersection\", \"BFS/DFS\"]")
                .extractedKeywords("[\"cardinality\", \"disjoint set\", \"adjacency matrix\"]")
                .aiSummary("Fundamental discrete structures covering set notation and graph representations.")
                .extractedText("Set theory defines basic collection laws. A set contains unique elements...")
                .build();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(materialRepository.findByIdAndStudentId(materialId, studentId)).thenReturn(Optional.of(material));
        when(chatHistoryRepository.findTop10ByStudentIdAndSessionIdOrderByCreatedAtDesc(eq(studentId), any()))
                .thenReturn(List.of());
        when(groqService.chat(anyString(), anyList(), anyString()))
                .thenReturn("## What is a Set?\n\nA set is a collection of distinct objects.\n\n### Example\n`A = {1, 2, 3}`");

        ChatRequest request = new ChatRequest();
        request.setMessage("Explain sets from my uploaded material");
        request.setMaterialId(materialId);
        request.setSessionId("session-123");

        AiChatResponse response = aiAssistantService.chat(studentId, request);

        assertNotNull(response);
        assertEquals("session-123", response.getSessionId());
        assertTrue(response.getReply().contains("What is a Set?"));

        // Capture context passed to groqService
        ArgumentCaptor<String> contextCaptor = ArgumentCaptor.forClass(String.class);
        verify(groqService).chat(eq("Explain sets from my uploaded material"), anyList(), contextCaptor.capture());

        String passedContext = contextCaptor.getValue();
        assertNotNull(passedContext);
        assertTrue(passedContext.contains("Unit 2: Graph Theory & Set Operations"));
        assertTrue(passedContext.contains("Discrete Mathematics"));
        assertTrue(passedContext.contains("Chapter 1: Sets and Relations"));
    }

    @Test
    void testChat_WithStudyAdvice_InjectsStudentAcademicProfile() {
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(materialRepository.findAllByStudentIdOrderByCreatedAtDesc(studentId)).thenReturn(List.of());
        when(chatHistoryRepository.findTop10ByStudentIdAndSessionIdOrderByCreatedAtDesc(eq(studentId), any()))
                .thenReturn(List.of());
        when(groqService.chat(anyString(), anyList(), anyString()))
                .thenReturn("## Study Strategy for Today\n\nFocus on your weak subject for 2 hours.");

        ChatRequest request = new ChatRequest();
        request.setMessage("What should I study today?");
        request.setSessionId("session-456");

        AiChatResponse response = aiAssistantService.chat(studentId, request);

        assertNotNull(response);
        ArgumentCaptor<String> contextCaptor = ArgumentCaptor.forClass(String.class);
        verify(groqService).chat(eq("What should I study today?"), anyList(), contextCaptor.capture());

        String passedContext = contextCaptor.getValue();
        assertNotNull(passedContext);
        assertTrue(passedContext.contains("STUDENT ACADEMIC PROFILE"));
        assertTrue(passedContext.contains("Aswin Engineering Student"));
    }
}

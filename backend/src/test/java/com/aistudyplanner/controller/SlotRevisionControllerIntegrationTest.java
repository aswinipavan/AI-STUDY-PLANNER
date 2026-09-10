package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.CompleteRevisionRequest;
import com.aistudyplanner.model.dto.response.FormulaItem;
import com.aistudyplanner.model.dto.response.QuizQuestion;
import com.aistudyplanner.model.dto.response.SlotRevisionResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.security.JwtTokenProvider;
import com.aistudyplanner.service.SlotRevisionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseAuth;
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
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SlotRevisionController.class)
@DisplayName("Slot Revision Controller Integration Tests")
class SlotRevisionControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SlotRevisionService slotRevisionService;

    @MockBean
    private FirebaseAuth firebaseAuth;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private StudentRepository studentRepository;

    private UUID studentId;
    private UUID slotId;
    private Student student;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        slotId = UUID.randomUUID();

        student = Student.builder()
                .id(studentId)
                .firebaseUid("test-firebase-uid")
                .email("student@university.edu")
                .fullName("Aswini Pavan")
                .build();
    }

    private RequestPostProcessor mockAuth() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                student,
                null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
        );
        return authentication(auth);
    }

    @Test
    @DisplayName("GET /api/timetable/slots/{slotId}/revision returns 200 with revision payload")
    void getOrGenerateRevisionSuccess() throws Exception {
        SlotRevisionResponse response = SlotRevisionResponse.builder()
                .id(UUID.randomUUID())
                .slotId(slotId)
                .topic("Virtual Memory & Paging")
                .chapter("Chapter 8")
                .subjectName("Operating Systems")
                .summary("Concise revision summary of paging and virtual memory.")
                .keyConcepts(List.of("Paging", "Demand Paging", "TLB"))
                .importantFormulas(List.of(
                        FormulaItem.builder().name("EAT").formula("EAT = (1-p)m + p(s)").explanation("Memory latency").build()
                ))
                .quizQuestions(List.of(
                        QuizQuestion.builder().id(1).question("Q1?").options(List.of("A", "B", "C", "D")).correctOptionIndex(0).explanation("Exp").build()
                ))
                .weakAreas(List.of("Pitfall 1"))
                .quickRevisionPoints(List.of("Point 1"))
                .score(0)
                .isCompleted(false)
                .createdAt(OffsetDateTime.now())
                .build();

        when(slotRevisionService.getOrGenerateRevision(eq(studentId), eq(slotId))).thenReturn(response);

        mockMvc.perform(get("/api/timetable/slots/{slotId}/revision", slotId)
                        .with(mockAuth())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.topic").value("Virtual Memory & Paging"))
                .andExpect(jsonPath("$.data.summary").value("Concise revision summary of paging and virtual memory."))
                .andExpect(jsonPath("$.data.keyConcepts[0]").value("Paging"))
                .andExpect(jsonPath("$.data.importantFormulas[0].name").value("EAT"))
                .andExpect(jsonPath("$.data.quizQuestions[0].id").value(1))
                .andExpect(jsonPath("$.data.isCompleted").value(false));
    }

    @Test
    @DisplayName("POST /api/timetable/slots/{slotId}/revision/complete returns 200 with completed status")
    void completeRevisionSuccess() throws Exception {
        CompleteRevisionRequest request = CompleteRevisionRequest.builder()
                .score(100)
                .build();

        SlotRevisionResponse response = SlotRevisionResponse.builder()
                .id(UUID.randomUUID())
                .slotId(slotId)
                .topic("Virtual Memory & Paging")
                .summary("Summary")
                .score(100)
                .isCompleted(true)
                .completedAt(OffsetDateTime.now())
                .build();

        when(slotRevisionService.completeRevision(eq(studentId), eq(slotId), any(CompleteRevisionRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/timetable/slots/{slotId}/revision/complete", slotId)
                        .with(mockAuth())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isCompleted").value(true))
                .andExpect(jsonPath("$.data.score").value(100));
    }
}

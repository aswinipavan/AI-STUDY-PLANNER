package com.aistudyplanner.controller;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.dto.response.SlotVideoRecommendationsResponse;
import com.aistudyplanner.model.dto.response.VideoRecommendation;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.service.AdaptiveScheduleService;
import com.aistudyplanner.service.StudyEvidenceVerificationService;
import com.aistudyplanner.service.TimetableService;
import com.aistudyplanner.service.YouTubeRecommendationService;
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

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TimetableController.class)
@DisplayName("Timetable Video Recommendations Controller Integration Tests")
class TimetableVideoRecommendationsControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FirebaseAuth firebaseAuth;

    @MockBean
    private com.aistudyplanner.security.JwtTokenProvider jwtTokenProvider;

    @MockBean
    private StudentRepository studentRepository;

    @MockBean
    private TimetableService timetableService;

    @MockBean
    private AdaptiveScheduleService adaptiveScheduleService;

    @MockBean
    private StudyEvidenceVerificationService studyEvidenceVerificationService;

    @MockBean
    private YouTubeRecommendationService youTubeRecommendationService;

    private Student mockStudent;
    private UUID studentId;
    private UUID slotId;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        slotId = UUID.randomUUID();

        mockStudent = Student.builder()
                .id(studentId)
                .email("student@example.com")
                .fullName("Test Student")
                .firebaseUid("fb-uid-test")
                .build();
    }

    private RequestPostProcessor authenticatedStudent() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                mockStudent, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        return authentication(auth);
    }

    @Test
    @DisplayName("GET /api/timetable/slots/{slotId}/video-recommendations returns 200 with video list")
    void getVideoRecommendationsReturns200() throws Exception {
        VideoRecommendation video = VideoRecommendation.builder()
                .videoId("kJQP7kiw5Fk")
                .title("Fourier Series - Step by Step")
                .channelTitle("MIT OpenCourseWare")
                .thumbnailUrl("https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg")
                .videoUrl("https://www.youtube.com/watch?v=kJQP7kiw5Fk")
                .matchScore(94)
                .matchVerdict("EXCELLENT MATCH")
                .matchReason("Exact topic match in title")
                .build();

        SlotVideoRecommendationsResponse response = SlotVideoRecommendationsResponse.builder()
                .slotId(slotId)
                .topic("Fourier Series")
                .chapter("Fourier Analysis")
                .subjectName("Mathematics")
                .generatedQueries(List.of("Fourier Series Mathematics"))
                .recommendations(List.of(video))
                .isCached(false)
                .cachedAt(OffsetDateTime.now())
                .build();

        when(youTubeRecommendationService.getVideoRecommendations(eq(studentId), eq(slotId)))
                .thenReturn(response);

        mockMvc.perform(get("/api/timetable/slots/{slotId}/video-recommendations", slotId)
                        .with(authenticatedStudent())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.slotId").value(slotId.toString()))
                .andExpect(jsonPath("$.data.recommendations[0].videoId").value("kJQP7kiw5Fk"))
                .andExpect(jsonPath("$.data.recommendations[0].matchScore").value(94))
                .andExpect(jsonPath("$.data.recommendations[0].matchVerdict").value("EXCELLENT MATCH"));
    }

    @Test
    @DisplayName("POST /api/timetable/slots/{slotId}/video-recommendations/refresh forces fresh search")
    void refreshVideoRecommendationsReturns200() throws Exception {
        SlotVideoRecommendationsResponse response = SlotVideoRecommendationsResponse.builder()
                .slotId(slotId)
                .topic("Fourier Series")
                .subjectName("Mathematics")
                .recommendations(Collections.emptyList())
                .isCached(false)
                .build();

        when(youTubeRecommendationService.refreshVideoRecommendations(eq(studentId), eq(slotId)))
                .thenReturn(response);

        mockMvc.perform(post("/api/timetable/slots/{slotId}/video-recommendations/refresh", slotId)
                        .with(authenticatedStudent())
                        .with(csrf())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("GET video recommendations returns 404 when slot does not exist")
    void returns404WhenSlotNotFound() throws Exception {
        when(youTubeRecommendationService.getVideoRecommendations(eq(studentId), eq(slotId)))
                .thenThrow(new ResourceNotFoundException("Slot not found: " + slotId));

        mockMvc.perform(get("/api/timetable/slots/{slotId}/video-recommendations", slotId)
                        .with(authenticatedStudent())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}

package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.exception.UnauthorizedException;
import com.aistudyplanner.model.dto.response.SlotVideoRecommendationsResponse;
import com.aistudyplanner.model.dto.response.VideoRecommendation;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.model.entity.Timetable;
import com.aistudyplanner.model.entity.TimetableSlot;
import com.aistudyplanner.model.entity.VideoRecommendationCache;
import com.aistudyplanner.repository.TimetableSlotRepository;
import com.aistudyplanner.repository.VideoRecommendationCacheRepository;
import com.aistudyplanner.service.MaterialTopicReader.TopicDetail;
import com.aistudyplanner.service.YouTubeApiClient.RawYouTubeVideo;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("YouTubeRecommendationService Unit Tests")
class YouTubeRecommendationServiceTest {

    @Mock
    private TimetableSlotRepository timetableSlotRepository;

    @Mock
    private MaterialTopicReader materialTopicReader;

    @Mock
    private VideoQueryGeneratorService videoQueryGeneratorService;

    @Mock
    private YouTubeApiClient youTubeApiClient;

    @Mock
    private VideoRelevanceRanker videoRelevanceRanker;

    @Mock
    private VideoRecommendationCacheRepository cacheRepository;

    private ObjectMapper objectMapper = new ObjectMapper();

    private YouTubeRecommendationService service;

    private UUID studentId;
    private UUID slotId;
    private TimetableSlot slot;

    @BeforeEach
    void setUp() {
        service = new YouTubeRecommendationService(
                timetableSlotRepository,
                materialTopicReader,
                videoQueryGeneratorService,
                youTubeApiClient,
                videoRelevanceRanker,
                cacheRepository,
                objectMapper
        );

        studentId = UUID.randomUUID();
        slotId = UUID.randomUUID();

        Student student = Student.builder().id(studentId).build();
        Timetable timetable = Timetable.builder().id(UUID.randomUUID()).student(student).build();
        Subject subject = Subject.builder().id(UUID.randomUUID()).subjectName("Mathematics").build();

        slot = TimetableSlot.builder()
                .id(slotId)
                .timetable(timetable)
                .subject(subject)
                .topic("Eigenvalues and Eigenvectors")
                .build();
    }

    @Test
    @DisplayName("returns cached video recommendations without calling YouTube API")
    void returnsCachedRecommendations() {
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(slot));
        when(materialTopicReader.resolveTopicDetail(eq(studentId), any(), any(), any()))
                .thenReturn(TopicDetail.builder().topic("Eigenvalues").chapter("Linear Algebra").build());

        VideoRecommendation cachedRec = VideoRecommendation.builder()
                .videoId("abc1234")
                .title("Eigenvalues Complete Guide")
                .matchScore(92)
                .build();

        VideoRecommendationCache cacheEntry = VideoRecommendationCache.builder()
                .cacheKey("test-key")
                .recommendationsJson("[{\"videoId\":\"abc1234\",\"title\":\"Eigenvalues Complete Guide\",\"matchScore\":92}]")
                .createdAt(OffsetDateTime.now())
                .expiresAt(OffsetDateTime.now().plusHours(48))
                .build();

        when(cacheRepository.findByCacheKeyAndExpiresAtAfter(any(), any())).thenReturn(Optional.of(cacheEntry));

        SlotVideoRecommendationsResponse response = service.getVideoRecommendations(studentId, slotId);

        assertThat(response).isNotNull();
        assertThat(response.getIsCached()).isTrue();
        assertThat(response.getRecommendations()).hasSize(1);
        assertThat(response.getRecommendations().get(0).getVideoId()).isEqualTo("abc1234");
        verifyNoInteractions(youTubeApiClient);
    }

    @Test
    @DisplayName("executes search, ranks results, and saves to cache on cache miss")
    void executesSearchAndCachesOnMiss() {
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(slot));
        when(materialTopicReader.resolveTopicDetail(eq(studentId), any(), any(), any()))
                .thenReturn(TopicDetail.builder().topic("Eigenvalues").chapter("Linear Algebra").build());

        when(cacheRepository.findByCacheKeyAndExpiresAtAfter(any(), any())).thenReturn(Optional.empty());
        when(videoQueryGeneratorService.generateQueries(any(), any())).thenReturn(List.of("Eigenvalues Mathematics"));
        when(youTubeApiClient.isConfigured()).thenReturn(true);

        RawYouTubeVideo rawVideo = new RawYouTubeVideo("v99", "Eigenvalues Lecture", "desc", "Channel", "c1", "2023-01-01", "img", "url");
        when(youTubeApiClient.searchVideos("Eigenvalues Mathematics")).thenReturn(List.of(rawVideo));

        VideoRecommendation rankedRec = VideoRecommendation.builder()
                .videoId("v99")
                .title("Eigenvalues Lecture")
                .matchScore(90)
                .build();
        when(videoRelevanceRanker.rankAndFilter(any(), any(), any(), eq(4))).thenReturn(List.of(rankedRec));
        when(cacheRepository.findByCacheKey(any())).thenReturn(Optional.empty());

        SlotVideoRecommendationsResponse response = service.getVideoRecommendations(studentId, slotId);

        assertThat(response).isNotNull();
        assertThat(response.getIsCached()).isFalse();
        assertThat(response.getRecommendations()).hasSize(1);
        assertThat(response.getRecommendations().get(0).getVideoId()).isEqualTo("v99");
        verify(cacheRepository).save(any());
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when timetable slot does not exist")
    void throwsWhenSlotNotFound() {
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getVideoRecommendations(studentId, slotId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("throws UnauthorizedException when slot belongs to a different student")
    void throwsWhenSlotBelongsToAnotherStudent() {
        UUID differentStudentId = UUID.randomUUID();
        when(timetableSlotRepository.findById(slotId)).thenReturn(Optional.of(slot));

        assertThatThrownBy(() -> service.getVideoRecommendations(differentStudentId, slotId))
                .isInstanceOf(UnauthorizedException.class);
    }
}

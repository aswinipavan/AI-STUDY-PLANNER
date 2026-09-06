package com.aistudyplanner.service;

import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.exception.UnauthorizedException;
import com.aistudyplanner.model.dto.response.SlotVideoRecommendationsResponse;
import com.aistudyplanner.model.dto.response.VideoRecommendation;
import com.aistudyplanner.model.entity.Subject;
import com.aistudyplanner.model.entity.Timetable;
import com.aistudyplanner.model.entity.TimetableSlot;
import com.aistudyplanner.model.entity.VideoRecommendationCache;
import com.aistudyplanner.repository.TimetableSlotRepository;
import com.aistudyplanner.repository.VideoRecommendationCacheRepository;
import com.aistudyplanner.service.MaterialTopicReader.TopicDetail;
import com.aistudyplanner.service.YouTubeApiClient.RawYouTubeVideo;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Orchestrates educational YouTube video recommendations for timetable slots.
 *
 * <p>Resolves curriculum topic context, manages persistent multi-day caching, executes high-signal
 * search queries across YouTube API v3, and ranks videos with explainable pedagogical scoring.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class YouTubeRecommendationService {

    private final TimetableSlotRepository timetableSlotRepository;
    private final MaterialTopicReader materialTopicReader;
    private final VideoQueryGeneratorService videoQueryGeneratorService;
    private final YouTubeApiClient youTubeApiClient;
    private final VideoRelevanceRanker videoRelevanceRanker;
    private final VideoRecommendationCacheRepository cacheRepository;
    private final ObjectMapper objectMapper;

    @Value("${youtube.cache-ttl-hours:72}")
    private int cacheTtlHours = 72;

    /**
     * Retrieves ranked YouTube recommendations for a student's timetable slot.
     */
    @Transactional
    public SlotVideoRecommendationsResponse getVideoRecommendations(UUID studentId, UUID slotId) {
        return fetchRecommendations(studentId, slotId, false);
    }

    /**
     * Forces cache revalidation and re-fetches fresh YouTube recommendations for a slot.
     */
    @Transactional
    public SlotVideoRecommendationsResponse refreshVideoRecommendations(UUID studentId, UUID slotId) {
        return fetchRecommendations(studentId, slotId, true);
    }

    private SlotVideoRecommendationsResponse fetchRecommendations(UUID studentId, UUID slotId, boolean forceRefresh) {
        TimetableSlot slot = timetableSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable slot not found: " + slotId));

        Timetable timetable = slot.getTimetable();
        if (timetable == null || timetable.getStudent() == null || !timetable.getStudent().getId().equals(studentId)) {
            throw new UnauthorizedException("You do not have permission to access this timetable slot");
        }

        Subject subject = slot.getSubject();
        String subjectName = subject != null && subject.getSubjectName() != null ? subject.getSubjectName() : "General Studies";
        UUID subjectId = subject != null ? subject.getId() : null;
        String slotTopic = slot.getTopic() != null ? slot.getTopic() : subjectName;

        TopicDetail topicDetail = materialTopicReader.resolveTopicDetail(studentId, subjectId, slotTopic, subjectName);

        String rawCacheKey = String.format("%s|%s|%s",
                subjectName.toLowerCase(Locale.ROOT).trim(),
                Objects.toString(topicDetail.getChapter(), "General").toLowerCase(Locale.ROOT).trim(),
                MaterialTopicReader.canonicalTopicKey(topicDetail.getTopic()));
        String cacheKey = hashKey(rawCacheKey);

        // Check persistent cache if not forcing refresh
        if (!forceRefresh) {
            Optional<VideoRecommendationCache> cachedOpt = cacheRepository.findByCacheKeyAndExpiresAtAfter(cacheKey, OffsetDateTime.now());
            if (cachedOpt.isPresent()) {
                VideoRecommendationCache cached = cachedOpt.get();
                try {
                    List<VideoRecommendation> list = objectMapper.readValue(
                            cached.getRecommendationsJson(),
                            new TypeReference<List<VideoRecommendation>>() {});

                    log.info("Returning {} cached video recommendations for slot {} (key: {})",
                            list.size(), slotId, cacheKey);

                    return SlotVideoRecommendationsResponse.builder()
                            .slotId(slotId)
                            .topic(topicDetail.getTopic())
                            .chapter(topicDetail.getChapter())
                            .subjectName(subjectName)
                            .generatedQueries(Collections.emptyList())
                            .recommendations(list)
                            .isCached(true)
                            .cachedAt(cached.getCreatedAt())
                            .build();
                } catch (Exception e) {
                    log.warn("Failed to deserialize cached recommendations for key {}: {}", cacheKey, e.getMessage());
                }
            }
        }

        // Generate targeted search queries
        List<String> queries = videoQueryGeneratorService.generateQueries(topicDetail, subjectName);

        // Search YouTube
        List<RawYouTubeVideo> candidates = new ArrayList<>();
        if (youTubeApiClient.isConfigured()) {
            for (String q : queries) {
                List<RawYouTubeVideo> results = youTubeApiClient.searchVideos(q);
                candidates.addAll(results);
            }
        }

        // Rank and score candidates
        List<VideoRecommendation> ranked = videoRelevanceRanker.rankAndFilter(candidates, topicDetail, subjectName, 4);

        // Persist to database cache if non-empty
        if (!ranked.isEmpty()) {
            try {
                String json = objectMapper.writeValueAsString(ranked);
                VideoRecommendationCache cacheEntry = cacheRepository.findByCacheKey(cacheKey)
                        .orElseGet(() -> VideoRecommendationCache.builder().cacheKey(cacheKey).build());

                cacheEntry.setStudentId(studentId);
                cacheEntry.setTimetableSlotId(slotId);
                cacheEntry.setTopic(topicDetail.getTopic());
                cacheEntry.setChapter(topicDetail.getChapter());
                cacheEntry.setSubjectName(subjectName);
                cacheEntry.setRecommendationsJson(json);
                cacheEntry.setExpiresAt(OffsetDateTime.now().plusHours(Math.max(1, cacheTtlHours)));

                cacheRepository.save(cacheEntry);
                log.info("Cached {} video recommendations for topic '{}' until {}",
                        ranked.size(), topicDetail.getTopic(), cacheEntry.getExpiresAt());
            } catch (Exception e) {
                log.warn("Failed to persist video recommendations to cache: {}", e.getMessage());
            }
        }

        String warning = null;
        if (ranked.isEmpty()) {
            if (!youTubeApiClient.isConfigured()) {
                warning = "YouTube API key is not configured on backend. Set YOUTUBE_API_KEY in backend/.env to enable live search.";
            } else {
                warning = "No high-matching educational videos found for this specific topic right now.";
            }
        }

        return SlotVideoRecommendationsResponse.builder()
                .slotId(slotId)
                .topic(topicDetail.getTopic())
                .chapter(topicDetail.getChapter())
                .subjectName(subjectName)
                .generatedQueries(queries)
                .recommendations(ranked)
                .isCached(false)
                .cachedAt(OffsetDateTime.now())
                .warningMessage(warning)
                .build();
    }

    private String hashKey(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return Integer.toHexString(input.hashCode());
        }
    }
}

package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.response.VideoRecommendation;
import com.aistudyplanner.service.MaterialTopicReader.TopicDetail;
import com.aistudyplanner.service.YouTubeApiClient.RawYouTubeVideo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Ranks and scores educational video candidates with explainable relevance scoring.
 *
 * <p>Computes topic token overlap, chapter alignment, syllabus keywords, educational channel authority,
 * and penalizes non-educational noise/shorts to select the top 3-5 recommendations.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VideoRelevanceRanker {

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
            "by", "from", "is", "are", "was", "were", "what", "which", "how", "why",
            "chapter", "unit", "part", "introduction", "intro", "revision", "practice"
    );

    private static final List<String> EDUCATIONAL_CHANNELS_AND_TERMS = List.of(
            "nptel", "mit opencourseware", "khan academy", "gate smashers", "neso academy",
            "stanford", "harvard", "3blue1brown", "edureka", "simplilearn", "freecodecamp",
            "tutorial", "lecture", "derivation", "solved examples", "full course",
            "explanation", "concept", "crash course", "engineering", "academy", "class",
            "professor", "prof.", "dr.", "numerical", "worked problems"
    );

    private static final List<String> NOISE_INDICATORS = List.of(
            "#shorts", "#short", "tik tok", "meme", "parody", "reaction", "vlog",
            "official music video", "trailer", "gameplay", "gaming", "unboxing", "prank",
            "roast", "funny moments", "funny clip"
    );

    private static final Pattern TOKEN_SPLITTER = Pattern.compile("[^a-zA-Z0-9]+");

    /**
     * Ranks raw candidate videos against the given topic context and returns top recommendations.
     *
     * @param candidates list of raw videos from YouTube queries
     * @param topicDetail rich metadata of the topic
     * @param subjectName subject name
     * @param maxResults maximum items to return (typically 3-5)
     * @return sorted list of ranked VideoRecommendation objects
     */
    public List<VideoRecommendation> rankAndFilter(
            List<RawYouTubeVideo> candidates,
            TopicDetail topicDetail,
            String subjectName,
            int maxResults) {

        if (candidates == null || candidates.isEmpty()) {
            return Collections.emptyList();
        }

        // 1. Deduplicate by videoId
        Map<String, RawYouTubeVideo> uniqueVideos = new LinkedHashMap<>();
        for (RawYouTubeVideo video : candidates) {
            if (video != null && video.videoId() != null && !video.videoId().isBlank()) {
                uniqueVideos.putIfAbsent(video.videoId(), video);
            }
        }

        String rawTopic = topicDetail != null && topicDetail.getTopic() != null ? topicDetail.getTopic() : "";
        String rawChapter = topicDetail != null && topicDetail.getChapter() != null ? topicDetail.getChapter() : "";
        List<String> whatToStudy = topicDetail != null && topicDetail.getWhatToStudy() != null ? topicDetail.getWhatToStudy() : Collections.emptyList();

        Set<String> topicTokens = tokenize(rawTopic);
        Set<String> chapterTokens = tokenize(rawChapter);
        Set<String> subjectTokens = tokenize(subjectName);
        Set<String> syllabusTokens = tokenize(String.join(" ", whatToStudy));

        List<VideoScored> scoredList = new ArrayList<>();

        for (RawYouTubeVideo video : uniqueVideos.values()) {
            ScoringResult result = scoreVideo(video, rawTopic, topicTokens, rawChapter, chapterTokens, subjectTokens, syllabusTokens);
            scoredList.add(new VideoScored(video, result));
        }

        // Sort descending by score, then tie-break by publish date
        scoredList.sort((a, b) -> {
            int scoreDiff = Integer.compare(b.result.score(), a.result.score());
            if (scoreDiff != 0) return scoreDiff;
            return Objects.toString(b.video.publishedAt(), "").compareTo(Objects.toString(a.video.publishedAt(), ""));
        });

        int limit = Math.max(1, Math.min(maxResults, 10));

        return scoredList.stream()
                .limit(limit)
                .map(vs -> toDto(vs.video, vs.result))
                .collect(Collectors.toList());
    }

    private record ScoringResult(int score, String verdict, String reason) {}
    private record VideoScored(RawYouTubeVideo video, ScoringResult result) {}

    private ScoringResult scoreVideo(
            RawYouTubeVideo video,
            String exactTopic,
            Set<String> topicTokens,
            String exactChapter,
            Set<String> chapterTokens,
            Set<String> subjectTokens,
            Set<String> syllabusTokens) {

        int score = 0;
        List<String> reasonParts = new ArrayList<>();

        String title = (video.title() != null ? video.title() : "").toLowerCase(Locale.ROOT);
        String desc = (video.description() != null ? video.description() : "").toLowerCase(Locale.ROOT);
        String channel = (video.channelTitle() != null ? video.channelTitle() : "").toLowerCase(Locale.ROOT);
        String combined = title + " " + desc + " " + channel;

        // --- 1. Topic Match (up to 40 pts) ---
        String cleanExactTopic = exactTopic.toLowerCase(Locale.ROOT).trim();
        if (!cleanExactTopic.isBlank() && title.contains(cleanExactTopic)) {
            score += 40;
            reasonParts.add("Exact topic match in video title");
        } else if (!topicTokens.isEmpty()) {
            long matched = topicTokens.stream().filter(title::contains).count();
            if (matched > 0) {
                int topicPts = (int) Math.round(((double) matched / topicTokens.size()) * 40.0);
                score += topicPts;
                reasonParts.add(matched == topicTokens.size() ? "Full topic concept match in title" : "Partial topic match (" + matched + "/" + topicTokens.size() + " keywords)");
            } else {
                long descMatched = topicTokens.stream().filter(desc::contains).count();
                if (descMatched > 0) {
                    score += 15;
                    reasonParts.add("Topic concept mentioned in summary");
                }
            }
        }

        // --- 2. Chapter Match (up to 20 pts) ---
        String cleanChapter = exactChapter.toLowerCase(Locale.ROOT).trim();
        if (!cleanChapter.isBlank() && !cleanChapter.equalsIgnoreCase("general") && title.contains(cleanChapter)) {
            score += 20;
            reasonParts.add("Direct chapter alignment");
        } else if (!chapterTokens.isEmpty()) {
            long chMatched = chapterTokens.stream().filter(title::contains).count();
            if (chMatched > 0) {
                score += (int) Math.round(((double) chMatched / chapterTokens.size()) * 15.0);
                reasonParts.add("Chapter context match");
            }
        }

        // --- 3. Syllabus / What-to-study keywords (up to 20 pts) ---
        if (!syllabusTokens.isEmpty()) {
            long sylMatched = syllabusTokens.stream().filter(combined::contains).count();
            if (sylMatched > 0) {
                int sylPts = Math.min(20, (int) sylMatched * 4);
                score += sylPts;
                reasonParts.add("Aligns with syllabus learning points");
            }
        }

        // --- 4. Subject Match (up to 10 pts) ---
        if (!subjectTokens.isEmpty()) {
            long subMatched = subjectTokens.stream().filter(combined::contains).count();
            if (subMatched > 0) {
                score += 10;
            }
        }

        // --- 5. Educational Channel / Terms Boost (+10 pts) ---
        boolean eduBoost = false;
        for (String term : EDUCATIONAL_CHANNELS_AND_TERMS) {
            if (combined.contains(term)) {
                eduBoost = true;
                break;
            }
        }
        if (eduBoost) {
            score += 10;
            reasonParts.add("High pedagogical quality channel/format");
        }

        // --- 6. Noise & Shorts Penalty (-30 pts) ---
        for (String noise : NOISE_INDICATORS) {
            if (combined.contains(noise)) {
                score -= 30;
                break;
            }
        }

        // Clamp to 0..100
        score = Math.max(0, Math.min(score, 100));

        // Baseline minimum for retrieved videos matching search queries
        if (score < 40 && (!topicTokens.isEmpty() || !subjectTokens.isEmpty())) {
            score = 45;
        }

        String verdict;
        if (score >= 85) {
            verdict = "EXCELLENT MATCH";
        } else if (score >= 70) {
            verdict = "GOOD MATCH";
        } else {
            verdict = "RELATED";
        }

        String reason = reasonParts.isEmpty() ? "Relevant study topic overview" : String.join(" • ", reasonParts);

        return new ScoringResult(score, verdict, reason);
    }

    private VideoRecommendation toDto(RawYouTubeVideo video, ScoringResult result) {
        return VideoRecommendation.builder()
                .videoId(video.videoId())
                .title(video.title())
                .description(video.description())
                .channelTitle(video.channelTitle())
                .channelId(video.channelId())
                .publishedAt(video.publishedAt())
                .thumbnailUrl(video.thumbnailUrl())
                .videoUrl(video.videoUrl())
                .matchScore(result.score())
                .matchVerdict(result.verdict())
                .matchReason(result.reason())
                .duration("Study Session Video")
                .build();
    }

    private Set<String> tokenize(String text) {
        if (text == null || text.isBlank()) return Collections.emptySet();
        String[] words = TOKEN_SPLITTER.split(text.toLowerCase(Locale.ROOT));
        Set<String> tokens = new HashSet<>();
        for (String w : words) {
            String trimmed = w.trim();
            if (trimmed.length() >= 3 && !STOP_WORDS.contains(trimmed)) {
                tokens.add(trimmed);
            }
        }
        return tokens;
    }
}

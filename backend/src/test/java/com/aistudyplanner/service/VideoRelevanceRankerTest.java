package com.aistudyplanner.service;

import com.aistudyplanner.model.dto.response.VideoRecommendation;
import com.aistudyplanner.service.MaterialTopicReader.TopicDetail;
import com.aistudyplanner.service.YouTubeApiClient.RawYouTubeVideo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("VideoRelevanceRanker Unit Tests")
class VideoRelevanceRankerTest {

    private VideoRelevanceRanker ranker;

    @BeforeEach
    void setUp() {
        ranker = new VideoRelevanceRanker();
    }

    @Test
    @DisplayName("scores high relevance for exact topic match with educational terms")
    void scoresHighRelevanceForExactTopicMatch() {
        TopicDetail detail = TopicDetail.builder()
                .topic("Fourier Sine Series")
                .chapter("Fourier Analysis")
                .whatToStudy(List.of("Dirichlet conditions", "Fourier coefficients"))
                .build();

        RawYouTubeVideo goodVideo = new RawYouTubeVideo(
                "v101",
                "Fourier Sine Series - Solved Examples & Lecture",
                "Complete step by step tutorial on Fourier Sine Series and Dirichlet conditions.",
                "NPTEL IIT Madras",
                "ch1",
                "2023-01-01T00:00:00Z",
                "http://img.yt/101.jpg",
                "http://yt.com/watch?v=v101"
        );

        RawYouTubeVideo noiseVideo = new RawYouTubeVideo(
                "v102",
                "Fourier Series Meme Reaction #shorts",
                "Funny moments in math class gaming vlog",
                "Random Memes",
                "ch2",
                "2023-01-01T00:00:00Z",
                "http://img.yt/102.jpg",
                "http://yt.com/watch?v=v102"
        );

        List<VideoRecommendation> ranked = ranker.rankAndFilter(
                List.of(noiseVideo, goodVideo),
                detail,
                "Engineering Mathematics",
                4
        );

        assertThat(ranked).isNotEmpty();
        assertThat(ranked.get(0).getVideoId()).isEqualTo("v101");
        assertThat(ranked.get(0).getMatchScore()).isGreaterThanOrEqualTo(70);
        assertThat(ranked.get(0).getMatchVerdict()).isIn("EXCELLENT MATCH", "GOOD MATCH");
    }

    @Test
    @DisplayName("deduplicates multiple search candidates with same videoId")
    void deduplicatesCandidatesWithSameVideoId() {
        TopicDetail detail = TopicDetail.builder()
                .topic("Dijkstra Algorithm")
                .chapter("Graph Algorithms")
                .build();

        RawYouTubeVideo v1 = new RawYouTubeVideo("vid1", "Dijkstra Algorithm", "desc", "MIT", "c1", "2023-01-01", "img", "url");
        RawYouTubeVideo v2 = new RawYouTubeVideo("vid1", "Dijkstra Algorithm", "desc", "MIT", "c1", "2023-01-01", "img", "url");

        List<VideoRecommendation> ranked = ranker.rankAndFilter(List.of(v1, v2), detail, "Data Structures", 4);

        assertThat(ranked).hasSize(1);
    }
}

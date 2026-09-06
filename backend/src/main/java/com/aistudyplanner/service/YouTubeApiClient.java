package com.aistudyplanner.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Server-side client for the YouTube Data API v3.
 *
 * <p>Handles API key authentication, video query execution, strict timeout controls, and
 * graceful degradation if YouTube API quota is exceeded or unconfigured.</p>
 */
@Service
@Slf4j
public class YouTubeApiClient {

    private final String apiKey;
    private final String baseUrl;
    private final int connectTimeoutSeconds;
    private final int readTimeoutSeconds;
    private final int maxResultsPerQuery;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public YouTubeApiClient(
            @Value("${youtube.api-key:}") String apiKey,
            @Value("${youtube.base-url:https://www.googleapis.com/youtube/v3}") String baseUrl,
            @Value("${youtube.connect-timeout-seconds:5}") int connectTimeoutSeconds,
            @Value("${youtube.read-timeout-seconds:8}") int readTimeoutSeconds,
            @Value("${youtube.max-results-per-query:5}") int maxResultsPerQuery,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.replaceAll("/+$", "") : "https://www.googleapis.com/youtube/v3";
        this.connectTimeoutSeconds = Math.max(1, connectTimeoutSeconds);
        this.readTimeoutSeconds = Math.max(1, readTimeoutSeconds);
        this.maxResultsPerQuery = Math.max(1, Math.min(maxResultsPerQuery, 20));
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(this.connectTimeoutSeconds))
                .build();

        log.info("YouTubeApiClient initialized (configured={}, baseUrl={}, maxResults={})",
                isConfigured(), this.baseUrl, this.maxResultsPerQuery);
    }

    public record RawYouTubeVideo(
            String videoId,
            String title,
            String description,
            String channelTitle,
            String channelId,
            String publishedAt,
            String thumbnailUrl,
            String videoUrl
    ) {}

    /**
     * Checks if a non-empty YouTube API key has been configured.
     */
    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    /**
     * Executes a video search query against YouTube Data API v3.
     *
     * @param query search text
     * @return list of retrieved video records, or empty list on quota/failure/not configured
     */
    public List<RawYouTubeVideo> searchVideos(String query) {
        if (!isConfigured()) {
            log.debug("YouTube API search skipped: YOUTUBE_API_KEY is not configured.");
            return Collections.emptyList();
        }

        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }

        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = String.format("%s/search?part=snippet&type=video&videoEmbeddable=true&safeSearch=strict&relevanceLanguage=en&maxResults=%d&q=%s&key=%s",
                    baseUrl, maxResultsPerQuery, encodedQuery, apiKey);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(readTimeoutSeconds))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            long startTime = System.currentTimeMillis();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            long elapsed = System.currentTimeMillis() - startTime;

            int statusCode = response.statusCode();
            if (statusCode == 200) {
                List<RawYouTubeVideo> videos = parseSearchResponse(response.body());
                log.info("YouTube search success for query '{}': {} videos returned in {}ms",
                        query, videos.size(), elapsed);
                return videos;
            } else if (statusCode == 403) {
                log.warn("YouTube API quota exceeded or forbidden (status 403) for query '{}' in {}ms",
                        query, elapsed);
                return Collections.emptyList();
            } else {
                log.warn("YouTube API search failed with HTTP status {} for query '{}' in {}ms",
                        statusCode, query, elapsed);
                return Collections.emptyList();
            }
        } catch (Exception e) {
            log.warn("Error calling YouTube API for query '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<RawYouTubeVideo> parseSearchResponse(String jsonBody) {
        if (jsonBody == null || jsonBody.isBlank()) {
            return Collections.emptyList();
        }

        List<RawYouTubeVideo> result = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(jsonBody);
            JsonNode items = root.path("items");
            if (items.isArray()) {
                for (JsonNode item : items) {
                    JsonNode idNode = item.path("id");
                    String videoId = idNode.path("videoId").asText("");
                    if (videoId.isBlank()) {
                        continue;
                    }

                    JsonNode snippet = item.path("snippet");
                    String title = unescapeHtml(snippet.path("title").asText(""));
                    String description = snippet.path("description").asText("");
                    String channelTitle = snippet.path("channelTitle").asText("");
                    String channelId = snippet.path("channelId").asText("");
                    String publishedAt = snippet.path("publishedAt").asText("");

                    JsonNode thumbnails = snippet.path("thumbnails");
                    String thumbnailUrl = "";
                    if (thumbnails.hasNonNull("high")) {
                        thumbnailUrl = thumbnails.path("high").path("url").asText("");
                    } else if (thumbnails.hasNonNull("medium")) {
                        thumbnailUrl = thumbnails.path("medium").path("url").asText("");
                    } else if (thumbnails.hasNonNull("default")) {
                        thumbnailUrl = thumbnails.path("default").path("url").asText("");
                    }

                    if (thumbnailUrl.isBlank()) {
                        thumbnailUrl = "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg";
                    }

                    String videoUrl = "https://www.youtube.com/watch?v=" + videoId;

                    result.add(new RawYouTubeVideo(
                            videoId,
                            title,
                            description,
                            channelTitle,
                            channelId,
                            publishedAt,
                            thumbnailUrl,
                            videoUrl
                    ));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse YouTube API JSON response: {}", e.getMessage());
        }
        return result;
    }

    private String unescapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&quot;", "\"")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&#39;", "'")
                .replace("&apos;", "'");
    }
}

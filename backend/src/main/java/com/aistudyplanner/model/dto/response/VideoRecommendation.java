package com.aistudyplanner.model.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Intelligent YouTube video recommendation for a study slot")
public class VideoRecommendation {

    @Schema(description = "YouTube video identifier", example = "kJQP7kiw5Fk")
    private String videoId;

    @Schema(description = "Video title", example = "Fourier Series - Direct Method and Formulas")
    private String title;

    @Schema(description = "Video description snippet", example = "Comprehensive breakdown of Fourier series expansion...")
    private String description;

    @Schema(description = "YouTube channel name", example = "MIT OpenCourseWare")
    private String channelTitle;

    @Schema(description = "YouTube channel identifier", example = "UCEBb1b_L6zDS3xTUrIALZOw")
    private String channelId;

    @Schema(description = "ISO-8601 published date", example = "2023-05-12T14:30:00Z")
    private String publishedAt;

    @Schema(description = "Thumbnail image URL", example = "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg")
    private String thumbnailUrl;

    @Schema(description = "Direct YouTube watch URL", example = "https://www.youtube.com/watch?v=kJQP7kiw5Fk")
    private String videoUrl;

    @Schema(description = "Relevance match score (0-100)", example = "94")
    private Integer matchScore;

    @Schema(description = "Match verdict label", example = "EXCELLENT MATCH")
    private String matchVerdict;

    @Schema(description = "Explainable reasoning for the match score", example = "Direct topic token overlap in title and syllabus alignment")
    private String matchReason;

    @Schema(description = "Estimated duration or display label", example = "15 mins")
    private String duration;
}

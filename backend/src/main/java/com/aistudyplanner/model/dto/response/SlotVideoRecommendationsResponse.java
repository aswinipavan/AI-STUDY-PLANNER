package com.aistudyplanner.model.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Video recommendations response for a timetable study slot")
public class SlotVideoRecommendationsResponse {

    @Schema(description = "Timetable slot UUID", example = "d3b07384-d113-40a2-a9b0-13f89e4726de")
    private UUID slotId;

    @Schema(description = "Assigned study topic", example = "Fourier Series Sine Expansion")
    private String topic;

    @Schema(description = "Assigned chapter", example = "Chapter 4 - Fourier Analysis")
    private String chapter;

    @Schema(description = "Subject name", example = "Engineering Mathematics III")
    private String subjectName;

    @Schema(description = "High-signal search queries generated for this topic")
    private List<String> generatedQueries;

    @Schema(description = "Ranked 3-5 educational video recommendations")
    private List<VideoRecommendation> recommendations;

    @Schema(description = "Indicates whether recommendations were loaded from persistent cache", example = "true")
    private Boolean isCached;

    @Schema(description = "Timestamp when recommendations were cached")
    private OffsetDateTime cachedAt;

    @Schema(description = "Informative warning or status notice if YouTube API operated in fallback/quota mode")
    private String warningMessage;
}

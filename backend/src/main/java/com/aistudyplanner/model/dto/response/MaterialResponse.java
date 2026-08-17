package com.aistudyplanner.model.dto.response;

import com.aistudyplanner.model.MaterialType;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialResponse {

    private UUID id;
    private SubjectResponse subject;
    private String title;
    private String fileName;
    private String fileUrl;
    private String fileType;
    private MaterialType materialType;
    private Long fileSizeBytes;
    private String aiSummary;
    private String aiCategorizedSubject;
    private com.aistudyplanner.model.ProcessingStatus processingStatus;
    private String extractedTopics;
    private String extractedChapters;
    private String extractedKeywords;
    private String overallDifficulty;
    private Integer difficultyScore;
    private String difficultyReason;
    private String errorMessage;
    private OffsetDateTime uploadedAt;
}

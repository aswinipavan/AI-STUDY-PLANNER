package com.aistudyplanner.model.dto.response;

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
public class SlotRevisionResponse {
    private UUID id;
    private UUID slotId;
    private String topic;
    private String chapter;
    private String subjectName;
    private String summary;
    private List<String> keyConcepts;
    private List<FormulaItem> importantFormulas;
    private List<QuizQuestion> quizQuestions;
    private List<String> weakAreas;
    private List<String> quickRevisionPoints;
    private Integer score;
    private Boolean isCompleted;
    private OffsetDateTime completedAt;
    private OffsetDateTime createdAt;
}

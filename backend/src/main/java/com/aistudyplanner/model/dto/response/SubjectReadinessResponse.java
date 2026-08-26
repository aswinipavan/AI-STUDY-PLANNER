package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Per-subject adaptive signals: how much of the real uploaded material has actually been covered,
 * how reliably the student is turning up for that subject's sessions, and the resulting readiness
 * and priority. Every field here is derived from stored data (marks, extracted material topics,
 * completed/missed slots, exam dates, material difficulty) — none of it is a fixed constant.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectReadinessResponse {

    private UUID subjectId;
    private String subjectName;

    /** Rolling marks average, or null when the student has recorded no marks for this subject. */
    private Double averagePercentage;
    private Integer difficultyLevel;

    /** Topics extracted from the student's uploaded material for this subject. */
    private Integer totalTopics;
    /** Distinct extracted topics already covered by a completed session. */
    private Integer coveredTopics;
    /** {@code coveredTopics / totalTopics} as a percentage (0–100). */
    private Double coveragePercent;

    private Integer completedSessions;
    /** Sessions whose date has passed while still not completed. */
    private Integer missedSessions;
    private Integer upcomingSessions;

    /** completed / (completed + missed) as a percentage — real attendance, not the streak counter. */
    private Double consistencyPercent;

    /** Mean 0–100 difficulty score of this subject's processed material, or null when unknown. */
    private Double materialDifficulty;

    private LocalDate nextExamDate;
    private Long daysUntilExam;

    /** Composite 0–100 readiness for this subject. */
    private Double readiness;
    /**
     * 0–100 exam preparedness: whether topic coverage is keeping pace with the days left before this
     * subject's next exam. Null when the subject has no upcoming exam.
     */
    private Double examPreparedness;
    /** Relative scheduling weight used by the planner (higher → more sessions). */
    private Double priorityWeight;
    /** Share of the plan's sessions this subject receives, as a percentage. */
    private Double sessionSharePercent;
    /**
     * Daily study time derived from the student's own {@code availableHoursPerDay} and this subject's
     * share of the weighting — never a hard-coded duration.
     */
    private String recommendedStudyTime;

    /** Whether the subject has run out of uncovered material and is now in reinforcement mode. */
    private Boolean allTopicsCovered;
    /** REVISION / PRACTICE / WEAK_AREA / FINAL_PREP / LEARNING. */
    private String stage;

    /** Plain-language reasons behind this subject's priority. */
    private List<String> reasons;
}

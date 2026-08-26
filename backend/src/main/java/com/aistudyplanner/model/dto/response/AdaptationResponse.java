package com.aistudyplanner.model.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Result of an adaptive re-plan: what changed, why it changed, and the resulting timetable.
 *
 * <p>The {@code changes} list is the "explain why the plan changed" payload — human-readable
 * sentences generated from the actual signals that moved (sessions completed, sessions missed,
 * new material processed, exam proximity, marks). It is intentionally derived from stored state
 * rather than a free-text LLM answer, so it is always consistent with the schedule the student
 * is looking at.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdaptationResponse {

    /** True when future slots were actually rewritten. False means nothing needed to change. */
    private Boolean adapted;

    /** What kicked off the adaptation: SESSION_COMPLETED / MISSED_SESSIONS / NEW_MATERIAL / EXAM_CHANGED / MARKS_CHANGED / MANUAL. */
    private String trigger;

    /** One-line summary suitable for a toast or banner. */
    private String summary;

    /** Ordered, human-readable explanations of every adjustment that was made. */
    private List<String> changes;

    private Integer slotsRemoved;
    private Integer slotsCreated;
    private Integer slotsPreserved;
    private Integer missedSessionsRescheduled;

    private LocalDate horizonStart;
    private LocalDate horizonEnd;

    /** Per-subject readiness after the adaptation. */
    private List<SubjectReadinessResponse> subjects;

    /** The refreshed active timetable, so clients need no second round-trip. */
    private TimetableResponse timetable;
}

package com.aistudyplanner.model;

import java.time.Duration;
import java.time.LocalTime;

/**
 * The user's preferred daily study window. This is the SINGLE SOURCE OF TRUTH for when
 * generated timetable slots are scheduled — replacing the previously hard-coded 18:00 start.
 *
 * <p>The value is stored on {@code Student.preferredStudyTime} (as the enum name) and chosen
 * by the student in Settings → "Preferred Study Time of Day". Windows are same-day (they never
 * cross midnight) so slot start/end times remain well-ordered within a single TIME column and
 * render correctly on the weekly grid.</p>
 */
public enum StudyTimeWindow {
    MORNING(LocalTime.of(6, 0), LocalTime.of(12, 0)),
    AFTERNOON(LocalTime.of(12, 0), LocalTime.of(17, 0)),
    EVENING(LocalTime.of(17, 0), LocalTime.of(21, 0)),
    LATE_NIGHT(LocalTime.of(21, 0), LocalTime.of(23, 59));

    private final LocalTime startTime;
    private final LocalTime endTime;

    StudyTimeWindow(LocalTime startTime, LocalTime endTime) {
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    /** Length of the study window in minutes. */
    public int getWindowMinutes() {
        return (int) Duration.between(startTime, endTime).toMinutes();
    }

    /**
     * Resolve a stored preference into a window. Accepts either the enum name ("EVENING") that the
     * Settings UI now persists, or the older human label ("Evening (5 PM - 9 PM)") for resilience.
     * Falls back to {@link #EVENING} when the value is null, blank, or unrecognised.
     */
    public static StudyTimeWindow fromSetting(String raw) {
        if (raw == null || raw.isBlank()) {
            return EVENING;
        }
        String normalized = raw.trim().toUpperCase();
        for (StudyTimeWindow window : values()) {
            if (window.name().equals(normalized)) {
                return window;
            }
        }
        // Human-label fallback (matches the leading keyword of the Settings dropdown options).
        if (normalized.startsWith("MORNING")) return MORNING;
        if (normalized.startsWith("AFTERNOON")) return AFTERNOON;
        if (normalized.startsWith("EVENING")) return EVENING;
        if (normalized.startsWith("LATE") || normalized.startsWith("NIGHT")) return LATE_NIGHT;
        return EVENING;
    }
}

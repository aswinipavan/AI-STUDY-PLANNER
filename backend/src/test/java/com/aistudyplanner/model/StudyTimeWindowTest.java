package com.aistudyplanner.model;

import com.aistudyplanner.model.StudyTimeWindow;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link StudyTimeWindow}.
 *
 * <p>Guards the canonical start times and backward-compatible {@code fromSetting} resolver.
 * Any change to these values would break the contract between the Java backend and the
 * TypeScript {@code WINDOW_START_TIMES} table in {@code studyPeriodUtils.ts}.</p>
 */
class StudyTimeWindowTest {

    // ── Canonical start times ─────────────────────────────────────────────────

    @Test
    @DisplayName("MORNING starts at 06:00 — must match WINDOW_START_TIMES.MORNING in studyPeriodUtils.ts")
    void morningStartsAt0600() {
        assertEquals(LocalTime.of(6, 0), StudyTimeWindow.MORNING.getStartTime());
    }

    @Test
    @DisplayName("AFTERNOON starts at 12:00 — must match WINDOW_START_TIMES.AFTERNOON in studyPeriodUtils.ts")
    void afternoonStartsAt1200() {
        assertEquals(LocalTime.of(12, 0), StudyTimeWindow.AFTERNOON.getStartTime());
    }

    @Test
    @DisplayName("EVENING starts at 17:00 — must match WINDOW_START_TIMES.EVENING in studyPeriodUtils.ts")
    void eveningStartsAt1700() {
        assertEquals(LocalTime.of(17, 0), StudyTimeWindow.EVENING.getStartTime());
    }

    @Test
    @DisplayName("LATE_NIGHT starts at 21:00 — must match WINDOW_START_TIMES.LATE_NIGHT in studyPeriodUtils.ts")
    void lateNightStartsAt2100() {
        assertEquals(LocalTime.of(21, 0), StudyTimeWindow.LATE_NIGHT.getStartTime());
    }

    // ── fromSetting — enum name round-trip ────────────────────────────────────

    @Test
    @DisplayName("fromSetting(\"EVENING\") resolves to EVENING")
    void fromSettingEnumNameEvening() {
        assertEquals(StudyTimeWindow.EVENING, StudyTimeWindow.fromSetting("EVENING"));
    }

    @Test
    @DisplayName("fromSetting(\"MORNING\") resolves to MORNING")
    void fromSettingEnumNameMorning() {
        assertEquals(StudyTimeWindow.MORNING, StudyTimeWindow.fromSetting("MORNING"));
    }

    @Test
    @DisplayName("fromSetting(\"AFTERNOON\") resolves to AFTERNOON")
    void fromSettingEnumNameAfternoon() {
        assertEquals(StudyTimeWindow.AFTERNOON, StudyTimeWindow.fromSetting("AFTERNOON"));
    }

    @Test
    @DisplayName("fromSetting(\"LATE_NIGHT\") resolves to LATE_NIGHT")
    void fromSettingEnumNameLateNight() {
        assertEquals(StudyTimeWindow.LATE_NIGHT, StudyTimeWindow.fromSetting("LATE_NIGHT"));
    }

    // ── fromSetting — backward-compatible human labels ────────────────────────

    @Test
    @DisplayName("Backward compat: 'Evening (5 PM - 9 PM)' still resolves to EVENING (req I)")
    void fromSettingOldLabelEvening() {
        assertEquals(StudyTimeWindow.EVENING, StudyTimeWindow.fromSetting("Evening (5 PM - 9 PM)"));
    }

    @Test
    @DisplayName("Backward compat: 'Morning (6 AM - 12 PM)' still resolves to MORNING (req I)")
    void fromSettingOldLabelMorning() {
        assertEquals(StudyTimeWindow.MORNING, StudyTimeWindow.fromSetting("Morning (6 AM - 12 PM)"));
    }

    @Test
    @DisplayName("Backward compat: 'Afternoon (12 PM - 5 PM)' still resolves to AFTERNOON (req I)")
    void fromSettingOldLabelAfternoon() {
        assertEquals(StudyTimeWindow.AFTERNOON, StudyTimeWindow.fromSetting("Afternoon (12 PM - 5 PM)"));
    }

    @Test
    @DisplayName("Backward compat: 'Late Night (9 PM - 12 AM)' still resolves to LATE_NIGHT (req I)")
    void fromSettingOldLabelLateNight() {
        assertEquals(StudyTimeWindow.LATE_NIGHT, StudyTimeWindow.fromSetting("Late Night (9 PM - 12 AM)"));
    }

    // ── fromSetting — null / blank / unknown fallback ─────────────────────────

    @Test
    @DisplayName("fromSetting(null) falls back to EVENING")
    void fromSettingNullFallback() {
        assertEquals(StudyTimeWindow.EVENING, StudyTimeWindow.fromSetting(null));
    }

    @Test
    @DisplayName("fromSetting(\"\") falls back to EVENING")
    void fromSettingBlankFallback() {
        assertEquals(StudyTimeWindow.EVENING, StudyTimeWindow.fromSetting(""));
    }

    @Test
    @DisplayName("fromSetting with unknown value falls back to EVENING")
    void fromSettingUnknownFallback() {
        assertEquals(StudyTimeWindow.EVENING, StudyTimeWindow.fromSetting("UNKNOWN_VALUE"));
    }

    // ── Window minutes sanity ────────────────────────────────────────────────

    @Test
    @DisplayName("EVENING window minutes is 240 (17:00-21:00 = 4h)")
    void eveningWindowMinutes() {
        assertEquals(240, StudyTimeWindow.EVENING.getWindowMinutes());
    }

    @Test
    @DisplayName("MORNING window minutes is 360 (06:00-12:00 = 6h)")
    void morningWindowMinutes() {
        assertEquals(360, StudyTimeWindow.MORNING.getWindowMinutes());
    }
}

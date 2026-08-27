/**
 * studyPeriodUtils.ts
 *
 * Pure utility: derives the actual daily study period that the timetable generator
 * will use, given the user's two stored preferences:
 *
 *   preferredStudyTime (StudyTimeWindow enum name)  →  canonical start time
 *   availableHoursPerDay                            →  duration
 *
 * The backend (TimetableService / AdaptiveScheduleService) already uses exactly
 * this logic to compute slot start/end times.  This file mirrors that calculation
 * on the frontend so every UI surface shows the same value.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * RULES that must stay in sync with StudyTimeWindow.java:
 *   MORNING    → 06:00
 *   AFTERNOON  → 12:00
 *   EVENING    → 17:00
 *   LATE_NIGHT → 21:00
 * ──────────────────────────────────────────────────────────────────────────────
 */

/** Maps StudyTimeWindow enum name → window start time as "HH:mm" (24-hour). */
export const WINDOW_START_TIMES: Record<string, string> = {
  MORNING: '06:00',
  AFTERNOON: '12:00',
  EVENING: '17:00',
  LATE_NIGHT: '21:00',
};

/**
 * Human-readable start-time labels used in the Settings dropdown.
 * These replace the old misleading broad-range labels ("Evening (5 PM - 9 PM)")
 * with start-time-only labels ("5:00 PM").
 */
export const WINDOW_START_LABELS: Record<string, string> = {
  MORNING: '6:00 AM',
  AFTERNOON: '12:00 PM',
  EVENING: '5:00 PM',
  LATE_NIGHT: '9:00 PM',
};

/** Maps the human-readable start-time label back to the enum name for persistence. */
export const LABEL_TO_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(WINDOW_START_LABELS).map(([k, v]) => [v, k])
);

/** Maps the enum name back to the human-readable start-time label for display. */
export const ENUM_TO_LABEL: Record<string, string> = { ...WINDOW_START_LABELS };

// ─── Time helpers ─────────────────────────────────────────────────────────────

/**
 * Parse "HH:mm" into { hours, minutes }.
 * Returns 0/0 for any invalid input to avoid runtime crashes.
 */
function parseHHmm(hhmm: string): { hours: number; minutes: number } {
  const parts = (hhmm ?? '').split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  return {
    hours: Number.isFinite(h) ? h : 0,
    minutes: Number.isFinite(m) ? m : 0,
  };
}

/**
 * Add a fractional-hour duration to a "HH:mm" start string and return the
 * resulting end time as "HH:mm" (does NOT wrap past midnight — returns values
 * > 23:59 to signal an edge case the UI can handle explicitly).
 */
function addHours(startHHmm: string, hours: number): { hhmm: string; crossesMidnight: boolean } {
  const { hours: sh, minutes: sm } = parseHHmm(startHHmm);
  const totalMinutes = sh * 60 + sm + Math.round(hours * 60);
  const endH = Math.floor(totalMinutes / 60);
  const endM = totalMinutes % 60;
  const crossesMidnight = endH >= 24;
  const clampedH = crossesMidnight ? endH - 24 : endH;
  const hhmm = `${String(clampedH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  return { hhmm, crossesMidnight };
}

/**
 * Format a "HH:mm" string to a locale-friendly time such as "5:00 PM".
 * Falls back to the raw string on any parse error.
 * AM/PM is always upper-cased for consistency (toLocaleTimeString is locale-dependent).
 */
export function formatTime(hhmm: string): string {
  try {
    const { hours, minutes } = parseHHmm(hhmm);
    const date = new Date(2000, 0, 1, hours, minutes);
    const raw = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    // Normalize: "5:00 am" → "5:00 AM", "12:00 pm" → "12:00 PM"
    return raw.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  } catch {
    return hhmm;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface StudyPeriod {
  /** Formatted start time, e.g. "5:00 PM" */
  start: string;
  /** Formatted end time, e.g. "6:00 PM" */
  end: string;
  /** Human-readable range, e.g. "5:00 PM – 6:00 PM" */
  label: string;
  /**
   * True when the end time falls after midnight.
   * The UI should warn the user rather than silently wrapping to the next day.
   */
  crossesMidnight: boolean;
}

/**
 * Compute the actual daily study period from the two stored user preferences.
 *
 * This is the CANONICAL calculation that all UI surfaces must use.  It mirrors
 * `TimetableService.generateTimetableSlotsForDuration` exactly:
 *
 *   startTime  = StudyTimeWindow[windowEnum].startTime
 *   endTime    = startTime + availableHoursPerDay
 *
 * @param windowEnum     The `StudyTimeWindow` enum name stored on the student
 *                       (e.g. "EVENING").  Unknown values fall back to "EVENING".
 * @param hoursPerDay    The student's daily target study duration in hours.
 *                       Values outside [0.5, 24] are clamped.
 */
export function calcStudyPeriod(windowEnum: string, hoursPerDay: number): StudyPeriod {
  const safeEnum = WINDOW_START_TIMES[windowEnum] ? windowEnum : 'EVENING';
  const startHHmm = WINDOW_START_TIMES[safeEnum];
  const safeHours = Math.max(0.5, Math.min(24, hoursPerDay ?? 2));

  const { hhmm: endHHmm, crossesMidnight } = addHours(startHHmm, safeHours);

  const startFmt = formatTime(startHHmm);
  const endFmt = crossesMidnight
    ? formatTime(endHHmm) + ' (+1 day)'
    : formatTime(endHHmm);

  return {
    start: startFmt,
    end: endFmt,
    label: `${startFmt} – ${endFmt}`,
    crossesMidnight,
  };
}

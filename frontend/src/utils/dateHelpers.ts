/**
 * Canonical helpers for reasoning about timetable-slot dates on the client.
 *
 * The backend serialises a slot's calendar day as a plain `LocalDate`
 * ("2026-08-24"). Passing that straight to `new Date("2026-08-24")` parses it as
 * *UTC* midnight, which reads back as the previous calendar day for anyone west
 * of UTC — drawing a Monday session under Sunday, or hiding a session that is
 * really "today". Every consumer must go through these helpers so the day stays
 * the student's own local day and the logic never diverges between pages.
 */

/** Parse a backend slot date ("YYYY-MM-DD…") into a *local* midnight Date. */
export function parseSlotDate(value: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Short weekday label for a date, e.g. "Mon". */
export const dayLabel = (date: Date): string =>
  date.toLocaleDateString('en-US', { weekday: 'short' });

/** Local calendar day as YYYY-MM-DD, which compares correctly as a string. */
export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The local YYYY-MM-DD a slot belongs to, or null when it carries no date.
 * A dateless slot falls back to its weekday index at the call site.
 */
export function slotDayKey(slotDate?: string): string | null {
  if (!slotDate) return null;
  const parsed = parseSlotDate(slotDate);
  return parsed ? dayKey(parsed) : null;
}

/** Monday-based weekday index for a date (Mon=0 … Sun=6). */
export const mondayBasedIndex = (date: Date): number => (date.getDay() + 6) % 7;

/**
 * Categorize a slot's calendar date relative to today:
 * - 'PAST'   : date < today
 * - 'TODAY'  : date == today (or dateless slot)
 * - 'FUTURE' : date > today
 */
export function getSlotDateCategory(slotDate?: string, targetDate: Date = new Date()): 'PAST' | 'TODAY' | 'FUTURE' {
  if (!slotDate) return 'TODAY';
  const slotDay = slotDayKey(slotDate);
  if (!slotDay) return 'TODAY';
  const todayDay = dayKey(targetDate);
  if (slotDay === todayDay) return 'TODAY';
  if (slotDay > todayDay) return 'FUTURE';
  return 'PAST';
}

/** Check whether a slot is scheduled on a future calendar day */
export function isFutureSlot(slotDate?: string, targetDate: Date = new Date()): boolean {
  return getSlotDateCategory(slotDate, targetDate) === 'FUTURE';
}

/**
 * Human-readable availability label for future sessions.
 * e.g. "Available tomorrow", "Available on Sep 1", "Available on Sep 15"
 */
export function formatFutureAvailability(slotDate?: string, targetDate: Date = new Date()): string {
  if (!slotDate) return 'Future session';
  const parsed = parseSlotDate(slotDate);
  if (!parsed) return 'Future session';

  const todayDay = dayKey(targetDate);
  const tmrw = new Date(targetDate);
  tmrw.setDate(tmrw.getDate() + 1);
  const tomorrowDay = dayKey(tmrw);
  const slotDay = dayKey(parsed);

  if (slotDay === tomorrowDay) {
    return 'Available tomorrow';
  }
  const formatted = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Available on ${formatted}`;
}

/**
 * Parse time string ("17:00", "17:00:00", "5:00 PM") into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const str = timeStr.trim();

  // Check 12-hour format with AM/PM (e.g. "5:00 PM", "05:00 PM", "5:00:00 PM")
  const match12 = /(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i.exec(str);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridian = match12[3].toUpperCase();
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Check 24-hour format "HH:mm" or "HH:mm:ss"
  const match24 = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(str);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      return hours * 60 + minutes;
    }
  }
  return null;
}

export type TimetableSessionState =
  | 'FUTURE_LOCKED'
  | 'TODAY_UPCOMING'
  | 'TODAY_ACTIVE'
  | 'TODAY_COMPLETED'
  | 'PAST_MISSED'
  | 'CATCH_UP_TODAY';

export interface SessionStateEvaluation {
  state: TimetableSessionState;
  isActionable: boolean;
  isLocked: boolean;
  isMissed: boolean;
  isActive: boolean;
  isUpcoming: boolean;
  isCompleted: boolean;
  isCatchUpActive: boolean;
}

/**
 * Evaluates the precise canonical state of a timetable session based on local calendar date and time.
 *
 * States:
 * 1. TODAY_COMPLETED: Session is completed.
 * 2. FUTURE_LOCKED: Session date > today (future date). Cannot be completed early, never missed.
 * 3. PAST_MISSED: Session date < today without completion, OR today's session where local time > endTime without completion.
 * 4. CATCH_UP_TODAY: Session date == today, carried from a historical missed date, and local time <= endTime (not completed).
 * 5. TODAY_ACTIVE: Session is on today (standard) and local time is within [startTime, endTime].
 * 6. TODAY_UPCOMING: Session is on today (standard) and local time is before startTime.
 */
export function getSessionState(
  slot: {
    date?: string;
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    status?: string;
    isCompleted?: boolean;
    isCatchUp?: boolean;
  },
  now: Date = new Date()
): TimetableSessionState {
  if (slot.isCompleted || slot.status === 'completed') {
    return 'TODAY_COMPLETED';
  }

  const slotDay = slotDayKey(slot.date);
  const todayDay = dayKey(now);

  // 1. Future day: strictly FUTURE_LOCKED (never missed, cannot be completed early)
  if (slotDay !== null && slotDay > todayDay) {
    return 'FUTURE_LOCKED';
  }

  // 2. Past day: strictly PAST_MISSED
  if (slotDay !== null && slotDay < todayDay) {
    return 'PAST_MISSED';
  }

  // 3. Today's session (or dateless slot matching today's weekday)
  const isCatchUp = Boolean(slot.isCatchUp);
  const startMins = parseTimeToMinutes(slot.startTime);
  const endMins = parseTimeToMinutes(slot.endTime);

  // If time is unspecified, default to TODAY_UPCOMING or CATCH_UP_TODAY
  if (startMins === null || endMins === null) {
    return isCatchUp ? 'CATCH_UP_TODAY' : 'TODAY_UPCOMING';
  }

  const currentMins = now.getHours() * 60 + now.getMinutes();

  if (endMins < startMins) {
    // Overnight session crossing midnight (e.g. 23:00 to 01:00)
    if (currentMins >= startMins || currentMins <= endMins) {
      return isCatchUp ? 'CATCH_UP_TODAY' : 'TODAY_ACTIVE';
    }
    return isCatchUp ? 'CATCH_UP_TODAY' : 'TODAY_UPCOMING';
  }

  // Standard same-day session (e.g. 17:00 to 18:00)
  if (currentMins < startMins) {
    return isCatchUp ? 'CATCH_UP_TODAY' : 'TODAY_UPCOMING';
  }
  if (currentMins <= endMins) {
    return isCatchUp ? 'CATCH_UP_TODAY' : 'TODAY_ACTIVE';
  }
  // Execution window has passed on today without completion
  return 'PAST_MISSED';
}

export function evaluateSessionState(
  slot: {
    date?: string;
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    status?: string;
    isCompleted?: boolean;
    isCatchUp?: boolean;
  },
  now: Date = new Date()
): SessionStateEvaluation {
  const state = getSessionState(slot, now);

  const isCompleted = state === 'TODAY_COMPLETED';
  const isLocked = state === 'FUTURE_LOCKED';
  const isMissed = state === 'PAST_MISSED';
  const isActionable = !isLocked;

  const startMins = parseTimeToMinutes(slot.startTime);
  const endMins = parseTimeToMinutes(slot.endTime);
  const currentMins = now.getHours() * 60 + now.getMinutes();

  let isActive = false;
  let isUpcoming = false;

  if (state === 'TODAY_ACTIVE') {
    isActive = true;
  } else if (state === 'TODAY_UPCOMING') {
    isUpcoming = true;
  } else if (state === 'CATCH_UP_TODAY') {
    if (startMins !== null && endMins !== null) {
      if (endMins < startMins) {
        if (currentMins >= startMins || currentMins <= endMins) {
          isActive = true;
        } else {
          isUpcoming = true;
        }
      } else {
        if (currentMins >= startMins && currentMins <= endMins) {
          isActive = true;
        } else {
          isUpcoming = true;
        }
      }
    } else {
      isUpcoming = true;
    }
  }

  // A catch-up session is actionable on today (or past missed). Future is locked.
  const isCatchUpActive = (state === 'CATCH_UP_TODAY') || (Boolean(slot.isCatchUp) && isMissed);

  return {
    state,
    isActionable,
    isLocked,
    isMissed,
    isActive,
    isUpcoming,
    isCompleted,
    isCatchUpActive,
  };
}


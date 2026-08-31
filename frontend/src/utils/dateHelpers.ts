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


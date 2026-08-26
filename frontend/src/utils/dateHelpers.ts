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

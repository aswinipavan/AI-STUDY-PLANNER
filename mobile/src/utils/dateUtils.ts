import {format, formatDistanceToNow, parseISO, differenceInDays} from 'date-fns';

/**
 * Format a "YYYY-MM-DD" date string to a human-readable form.
 * e.g. "2026-08-20" → "Aug 20, 2026"
 */
export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Format a "HH:mm:ss" time string to "h:mm a" format.
 * e.g. "14:30:00" → "2:30 PM"
 */
export function formatTime(timeStr: string): string {
  try {
    // Parse time as today's date for formatting
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
    return format(date, 'h:mm a');
  } catch {
    return timeStr;
  }
}

/**
 * Format a slot time range: "2:30 PM – 4:00 PM"
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

/**
 * Returns the day label from dayOfWeek integer (0=Monday … 6=Sunday)
 */
export const DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function getDayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? 'Unknown';
}

export function getDayShort(dayOfWeek: number): string {
  return DAY_SHORT[dayOfWeek] ?? '?';
}

/**
 * Get today's dayOfWeek index (0=Monday … 6=Sunday)
 * Converts JS getDay() (0=Sunday) to backend convention (0=Monday)
 */
export function getTodayDayOfWeek(): number {
  const jsDay = new Date().getDay(); // 0=Sunday
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Returns a countdown string for exam date.
 * e.g. "in 3 days" | "today" | "2 days ago"
 */
export function formatExamCountdown(daysRemaining: number): string {
  if (daysRemaining === 0) {return 'Today';}
  if (daysRemaining === 1) {return 'Tomorrow';}
  if (daysRemaining > 1) {return `In ${daysRemaining} days`;}
  return `${Math.abs(daysRemaining)} days ago`;
}

/**
 * Format ISO datetime string to relative time.
 * e.g. "about 2 hours ago"
 */
export function formatRelativeTime(isoDateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(isoDateStr), {addSuffix: true});
  } catch {
    return isoDateStr;
  }
}

/**
 * Calculate slot duration in minutes.
 */
export function slotDurationMinutes(
  startTime: string,
  endTime: string,
): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

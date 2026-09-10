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
  if (!startTime || !endTime) return 60;
  const [sh = 0, sm = 0] = startTime.split(':').map(Number);
  const [eh = 0, em = 0] = endTime.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff > 0 ? diff : 60;
}

/**
 * Format total minutes to clean human-readable hours and minutes string.
 * e.g., 120 -> "2h", 90 -> "1h 30m", 45 -> "45m", 0 -> "0m"
 */
export function formatHoursAndMinutes(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

export interface DayStudyCapacityMobile {
  capacityMinutes: number;
  scheduledMinutes: number;
  remainingMinutes: number;
  isOverAllocated: boolean;
  utilizationPercent: number;
  capacityFormatted: string;
  scheduledFormatted: string;
  remainingFormatted: string;
}

/**
 * Compute daily study capacity and allocation metrics on mobile.
 */
export function computeDayStudyCapacityMobile(
  availableHoursPerDay: number = 2,
  slots: Array<{
    durationMinutes?: number;
    startTime?: string;
    endTime?: string;
  }> = []
): DayStudyCapacityMobile {
  const capacityMinutes = Math.max(0, Math.round((availableHoursPerDay || 2) * 60));
  
  const scheduledMinutes = slots.reduce((total, s) => {
    if (typeof s.durationMinutes === 'number' && s.durationMinutes > 0) {
      return total + s.durationMinutes;
    }
    if (s.startTime && s.endTime) {
      return total + slotDurationMinutes(s.startTime, s.endTime);
    }
    return total + 60;
  }, 0);

  const remainingMinutes = Math.max(0, capacityMinutes - scheduledMinutes);
  const isOverAllocated = scheduledMinutes > capacityMinutes;
  const utilizationPercent = capacityMinutes > 0 ? Math.round((scheduledMinutes / capacityMinutes) * 100) : 0;

  return {
    capacityMinutes,
    scheduledMinutes,
    remainingMinutes,
    isOverAllocated,
    utilizationPercent,
    capacityFormatted: formatHoursAndMinutes(capacityMinutes),
    scheduledFormatted: formatHoursAndMinutes(scheduledMinutes),
    remainingFormatted: formatHoursAndMinutes(remainingMinutes),
  };
}

export type MobileSessionState =
  | 'FUTURE_LOCKED'
  | 'TODAY_UPCOMING'
  | 'TODAY_ACTIVE'
  | 'TODAY_COMPLETED'
  | 'PAST_MISSED'
  | 'CATCH_UP_TODAY';

export function evaluateMobileSessionState(
  slot: {
    date?: string;
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    status?: string;
    isCompleted?: boolean;
    isCatchUp?: boolean;
    missedDate?: string;
  },
  now: Date = new Date()
): {
  state: MobileSessionState;
  isLocked: boolean;
  isMissed: boolean;
  isActive: boolean;
  isUpcoming: boolean;
  isCompleted: boolean;
  isCatchUp: boolean;
} {
  const isCompleted = Boolean(slot.isCompleted || slot.status === 'completed');
  if (isCompleted) {
    return {
      state: 'TODAY_COMPLETED',
      isLocked: false,
      isMissed: false,
      isActive: false,
      isUpcoming: false,
      isCompleted: true,
      isCatchUp: Boolean(slot.isCatchUp),
    };
  }

  const currentDayOfWeek = (now.getDay() + 6) % 7;
  const todayIso = format(now, 'yyyy-MM-dd');
  const slotDateIso = slot.date ? slot.date.split('T')[0] : null;

  // 1. Future check
  if (slotDateIso && slotDateIso > todayIso) {
    return {
      state: 'FUTURE_LOCKED',
      isLocked: true,
      isMissed: false,
      isActive: false,
      isUpcoming: false,
      isCompleted: false,
      isCatchUp: false,
    };
  }

  // 2. Past check
  if (slotDateIso && slotDateIso < todayIso) {
    return {
      state: 'PAST_MISSED',
      isLocked: false,
      isMissed: true,
      isActive: false,
      isUpcoming: false,
      isCompleted: false,
      isCatchUp: false,
    };
  }

  // 3. Today's execution window
  const isToday = slotDateIso ? slotDateIso === todayIso : slot.dayOfWeek === currentDayOfWeek;
  if (!isToday) {
    // If not matching today and no date given, treat as upcoming or past based on day index
    const isPastDay = slot.dayOfWeek !== undefined && slot.dayOfWeek < currentDayOfWeek;
    if (isPastDay) {
      return {
        state: 'PAST_MISSED',
        isLocked: false,
        isMissed: true,
        isActive: false,
        isUpcoming: false,
        isCompleted: false,
        isCatchUp: false,
      };
    }
  }

  const [sh = 0, sm = 0] = (slot.startTime || '00:00').split(':').map(Number);
  const [eh = 0, em = 0] = (slot.endTime || '00:00').split(':').map(Number);
  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins < startMins) endMins += 24 * 60;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const isCatchUp = Boolean(slot.isCatchUp);

  if (currentMins < startMins) {
    return {
      state: isCatchUp ? 'CATCH_UP_TODAY' : 'TODAY_UPCOMING',
      isLocked: false,
      isMissed: false,
      isActive: false,
      isUpcoming: true,
      isCompleted: false,
      isCatchUp,
    };
  }

  if (currentMins <= endMins) {
    return {
      state: isCatchUp ? 'CATCH_UP_TODAY' : 'TODAY_ACTIVE',
      isLocked: false,
      isMissed: false,
      isActive: true,
      isUpcoming: false,
      isCompleted: false,
      isCatchUp,
    };
  }

  // Past time on today
  return {
    state: 'PAST_MISSED',
    isLocked: false,
    isMissed: true,
    isActive: false,
    isUpcoming: false,
    isCompleted: false,
    isCatchUp,
  };
}

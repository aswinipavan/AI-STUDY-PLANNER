import { getTodayDayOfWeek } from './dateUtils';
import type { SlotResponse } from '@/types/timetable.types';

export interface DayStudyStatsMobile {
  todaySlots: SlotResponse[];
  scheduledMinutes: number;
  completedMinutes: number;
  completedSessions: number;
  totalSessions: number;
  plannedStudyTime: {
    value: string;
    unit: string;
    formatted: string;
  };
  completedStudyTime: {
    value: string;
    unit: string;
    formatted: string;
  };
}

/**
 * Local calendar day as YYYY-MM-DD for reliable date comparison without UTC shift.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Calculates slot duration in minutes.
 * Prefers backend canonical `durationMinutes` if valid > 0.
 * Otherwise parses `startTime` and `endTime`.
 */
export function calculateSlotDuration(slot: SlotResponse): number {
  if (typeof slot.durationMinutes === 'number' && slot.durationMinutes > 0) {
    return slot.durationMinutes;
  }
  if (slot.startTime && slot.endTime) {
    const [sh = 0, sm = 0] = slot.startTime.split(':').map(Number);
    const [eh = 0, em = 0] = slot.endTime.split(':').map(Number);
    if (!Number.isNaN(sh) && !Number.isNaN(eh)) {
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) {
        diff += 24 * 60; // Crosses midnight
      }
      return diff > 0 ? diff : 60;
    }
  }
  return 60;
}

/**
 * Formats duration in minutes to user-facing study time representation.
 */
export function formatStudyDuration(
  minutes: number,
  unitLabel: string = 'planned'
): { value: string; unit: string; formatted: string } {
  if (!minutes || minutes <= 0) {
    return { value: '0', unit: unitLabel, formatted: `0 ${unitLabel}` };
  }
  if (minutes % 60 === 0) {
    const hrs = minutes / 60;
    const val = `${hrs}h`;
    return { value: val, unit: unitLabel, formatted: `${val} ${unitLabel}` };
  }
  if (minutes % 30 === 0) {
    const hrs = (minutes / 60).toFixed(1).replace(/\.0$/, '');
    const val = `${hrs}h`;
    return { value: val, unit: unitLabel, formatted: `${val} ${unitLabel}` };
  }
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  if (hours > 0) {
    const val = `${hours}h ${remMins}m`;
    return { value: val, unit: unitLabel, formatted: `${val} ${unitLabel}` };
  }
  const val = `${remMins}m`;
  return { value: val, unit: unitLabel, formatted: `${val} ${unitLabel}` };
}

/**
 * Filter slots for a given calendar date and computes canonical scheduled & completed metrics.
 */
export function computeDayStudyStats(
  slots?: SlotResponse[] | null,
  targetDate: Date = new Date()
): DayStudyStatsMobile {
  if (!slots || !Array.isArray(slots) || slots.length === 0) {
    return {
      todaySlots: [],
      scheduledMinutes: 0,
      completedMinutes: 0,
      completedSessions: 0,
      totalSessions: 0,
      plannedStudyTime: formatStudyDuration(0, 'planned'),
      completedStudyTime: formatStudyDuration(0, 'completed'),
    };
  }

  const targetDayIso = getLocalDateString(targetDate);
  const targetDayIndex = getTodayDayOfWeek();

  const todaySlots = slots.filter((s) => {
    if (s.date) {
      // Normalize to YYYY-MM-DD
      const datePart = s.date.split('T')[0];
      return datePart === targetDayIso;
    }
    return s.dayOfWeek === targetDayIndex;
  });

  const scheduledMinutes = todaySlots.reduce((sum, s) => sum + calculateSlotDuration(s), 0);

  const completedSlots = todaySlots.filter(
    (s) => s.isCompleted === true
  );

  const completedMinutes = completedSlots.reduce((sum, s) => sum + calculateSlotDuration(s), 0);
  const completedSessions = completedSlots.length;
  const totalSessions = todaySlots.length;

  return {
    todaySlots,
    scheduledMinutes,
    completedMinutes,
    completedSessions,
    totalSessions,
    plannedStudyTime: formatStudyDuration(scheduledMinutes, 'planned'),
    completedStudyTime: formatStudyDuration(completedMinutes, 'completed'),
  };
}

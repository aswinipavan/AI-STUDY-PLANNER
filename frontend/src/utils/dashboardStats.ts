import { parseSlotDate, dayKey, slotDayKey, mondayBasedIndex } from './dateHelpers';

export interface TimetableSlotLike {
  id?: string;
  date?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number | null;
  status?: 'pending' | 'completed' | 'skipped' | 'missed' | string;
  isCompleted?: boolean;
  subject?: { name?: string; subjectName?: string } | string;
  subjectName?: string;
  topic?: string;
}

export interface DayStudyStats {
  todaySlots: TimetableSlotLike[];
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
 * Calculates slot duration in minutes.
 * Prefers backend canonical `durationMinutes` if valid > 0.
 * Otherwise parses `startTime` and `endTime` (supporting "HH:mm" and "HH:mm:ss").
 * Supports 45m, 60m, 90m, midnight crossing, etc.
 * Defaults to 60 minutes only if times cannot be resolved.
 */
export function calculateSlotDuration(slot: TimetableSlotLike): number {
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
 * - 0 mins -> { value: '0', unit: 'planned', formatted: '0 planned' }
 * - 60 mins -> { value: '1h', unit: 'planned', formatted: '1h planned' }
 * - 90 mins -> { value: '1.5h', unit: 'planned', formatted: '1.5h planned' }
 * - 45 mins -> { value: '45m', unit: 'planned', formatted: '45m planned' }
 * - 150 mins -> { value: '2.5h', unit: 'planned', formatted: '2.5h planned' }
 * - 75 mins -> { value: '1h 15m', unit: 'planned', formatted: '1h 15m planned' }
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
  slots?: TimetableSlotLike[] | null,
  targetDate: Date = new Date()
): DayStudyStats {
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

  const targetDayIso = dayKey(targetDate);
  const targetDayIndex = mondayBasedIndex(targetDate);

  const todaySlots = slots.filter((s) => {
    const iso = slotDayKey(s.date);
    return iso ? iso === targetDayIso : s.dayOfWeek === targetDayIndex;
  });

  const scheduledMinutes = todaySlots.reduce((sum, s) => sum + calculateSlotDuration(s), 0);

  const completedSlots = todaySlots.filter(
    (s) => s.status === 'completed' || s.isCompleted === true
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

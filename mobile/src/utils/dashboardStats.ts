import { getTodayDayOfWeek, formatTimeRange } from './dateUtils';
import type { SlotResponse } from '@/types/timetable.types';
import type { ExamResponse } from '@/types/exam.types';
import type { SubjectResponse } from '@/types/student.types';

export interface PrioritySubjectMobile {
  id?: string;
  subjectName: string;
  priorityScore?: number;
  priorityLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  averagePercentage?: number;
  difficultyLevel?: number;
  reasons?: string[];
}

export interface NextBestActionMobile {
  type: 'ACTIVE_NOW' | 'CATCH_UP' | 'HIGH_PRIORITY' | 'UPCOMING' | 'ALL_DONE' | 'NO_PLAN';
  actionTitle: string;
  targetName: string;
  topic?: string;
  timeRange?: string;
  durationMinutes?: number;
  reasons: string[];
  screen: string;
}

export interface CategorizedDaySlotsMobile {
  past: SlotResponse[];
  current: SlotResponse | null;
  upcoming: SlotResponse[];
}

export interface DayStudyStatsMobile {
  todaySlots: SlotResponse[];
  scheduledMinutes: number;
  completedMinutes: number;
  completedSessions: number;
  totalSessions: number;
  highPrioritySessions: number;
  catchUpSessions: number;
  completionRate: number;
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
  categorizedSlots: CategorizedDaySlotsMobile;
  nextBestAction: NextBestActionMobile;
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

export function resolveMobileSubjectName(slot: SlotResponse): string {
  return slot.subject?.subjectName || 'Study Session';
}

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr.trim());
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return h * 60 + m;
  }
  return null;
}

/**
 * Evaluates the next best action for mobile.
 */
export function evaluateNextBestActionMobile(
  todaySlots: SlotResponse[],
  allSlots: SlotResponse[] = [],
  upcomingExams: ExamResponse[] = [],
  priorities: (PrioritySubjectMobile | SubjectResponse)[] = [],
  targetDate: Date = new Date()
): NextBestActionMobile {
  if (!todaySlots || todaySlots.length === 0) {
    if (allSlots.length > 0) {
      return {
        type: 'ALL_DONE',
        actionTitle: 'Rest & Routine Maintenance',
        targetName: 'No Sessions Scheduled Today',
        reasons: ['No study slots scheduled for today in active plan'],
        screen: 'Timetable',
      };
    }
    return {
      type: 'NO_PLAN',
      actionTitle: 'Generate Your AI Study Plan',
      targetName: 'Customized to Your Exam Deadlines',
      reasons: ['No active timetable found for today'],
      screen: 'Timetable',
    };
  }

  const nowMins = targetDate.getHours() * 60 + targetDate.getMinutes();

  // 1. Active slot right now
  const activeSlot = todaySlots.find((s) => {
    if (s.isCompleted) return false;
    const startMins = parseTimeToMinutes(s.startTime);
    const endMins = parseTimeToMinutes(s.endTime);
    if (startMins == null || endMins == null) return false;
    return nowMins >= startMins && nowMins <= endMins;
  });

  if (activeSlot) {
    const subName = resolveMobileSubjectName(activeSlot);
    const timeStr = formatTimeRange(activeSlot.startTime, activeSlot.endTime);
    const duration = calculateSlotDuration(activeSlot);
    const reasons = [`⚡ Active study session right now (${timeStr})`];

    if (activeSlot.isCatchUp) {
      reasons.push('🔴 Catch-up required from previously missed session');
    }

    const matchedPriority = priorities.find((p) => p.subjectName.toLowerCase() === subName.toLowerCase()) as PrioritySubjectMobile | undefined;
    if (matchedPriority && matchedPriority.priorityLevel === 'HIGH') {
      reasons.push(`🔥 High priority subject (Score ${matchedPriority.priorityScore || 80})`);
    }

    const matchedExam = upcomingExams.find((e) => (e.subject?.subjectName || e.examName)?.toLowerCase() === subName.toLowerCase());
    if (matchedExam && matchedExam.daysRemaining != null) {
      reasons.push(`📝 Exam in ${matchedExam.daysRemaining} days (${matchedExam.examName || 'Exam'})`);
    }

    return {
      type: 'ACTIVE_NOW',
      actionTitle: 'Complete Active Session',
      targetName: subName,
      topic: activeSlot.topic || undefined,
      timeRange: timeStr,
      durationMinutes: duration,
      reasons,
      screen: 'Timetable',
    };
  }

  // 2. Uncompleted catch-up slot today
  const catchUpSlot = todaySlots.find((s) => s.isCatchUp && !s.isCompleted);
  if (catchUpSlot) {
    const subName = resolveMobileSubjectName(catchUpSlot);
    const timeStr = formatTimeRange(catchUpSlot.startTime, catchUpSlot.endTime);
    const duration = calculateSlotDuration(catchUpSlot);
    return {
      type: 'CATCH_UP',
      actionTitle: 'Catch Up on Missed Session',
      targetName: subName,
      topic: catchUpSlot.topic || undefined,
      timeRange: timeStr,
      durationMinutes: duration,
      reasons: [
        '🔴 Carried forward from previously missed study session',
        `⏳ Scheduled today: ${timeStr} (${duration}m)`,
      ],
      screen: 'Timetable',
    };
  }

  // 3. Upcoming slot
  const upcomingSlots = todaySlots.filter((s) => {
    if (s.isCompleted) return false;
    const startMins = parseTimeToMinutes(s.startTime);
    if (startMins == null) return true;
    return nowMins < startMins;
  });

  if (upcomingSlots.length > 0) {
    const highPriSlot = upcomingSlots.find((s) => {
      const sub = resolveMobileSubjectName(s);
      return priorities.some((p) => {
        const pObj = p as PrioritySubjectMobile;
        return p.subjectName.toLowerCase() === sub.toLowerCase() && pObj.priorityLevel === 'HIGH';
      });
    }) || upcomingSlots[0];

    const subName = resolveMobileSubjectName(highPriSlot);
    const timeStr = formatTimeRange(highPriSlot.startTime, highPriSlot.endTime);
    const duration = calculateSlotDuration(highPriSlot);
    const reasons = [`⏳ Next session scheduled for ${timeStr} (${duration}m)`];

    const matchedExam = upcomingExams.find((e) => (e.subject?.subjectName || e.examName)?.toLowerCase() === subName.toLowerCase());
    if (matchedExam && matchedExam.daysRemaining != null) {
      reasons.push(`📝 Exam in ${matchedExam.daysRemaining} days (${matchedExam.examName || 'Exam'})`);
    }

    return {
      type: 'UPCOMING',
      actionTitle: 'Next Up on Schedule',
      targetName: subName,
      topic: highPriSlot.topic || undefined,
      timeRange: timeStr,
      durationMinutes: duration,
      reasons,
      screen: 'Timetable',
    };
  }

  // 4. All completed
  const completedSlots = todaySlots.filter((s) => s.isCompleted);
  if (completedSlots.length === todaySlots.length && todaySlots.length > 0) {
    return {
      type: 'ALL_DONE',
      actionTitle: 'Daily Study Goals Completed! 🎉',
      targetName: 'All Sessions Finished',
      reasons: [
        `✅ All ${todaySlots.length} study sessions completed for today`,
        '🔥 Daily study streak maintained',
      ],
      screen: 'Timetable',
    };
  }

  return {
    type: 'UPCOMING',
    actionTitle: 'Review Study Schedule',
    targetName: 'Today\'s Study Plan',
    reasons: ['Check your upcoming timetable slots'],
    screen: 'Timetable',
  };
}

/**
 * Filter slots for a given calendar date and computes canonical scheduled & completed metrics.
 */
export function computeDayStudyStats(
  slots?: SlotResponse[] | null,
  targetDate: Date = new Date(),
  upcomingExams: ExamResponse[] = [],
  priorities: (PrioritySubjectMobile | SubjectResponse)[] = []
): DayStudyStatsMobile {
  if (!slots || !Array.isArray(slots) || slots.length === 0) {
    const emptyAction = evaluateNextBestActionMobile([], [], upcomingExams, priorities, targetDate);
    return {
      todaySlots: [],
      scheduledMinutes: 0,
      completedMinutes: 0,
      completedSessions: 0,
      totalSessions: 0,
      highPrioritySessions: 0,
      catchUpSessions: 0,
      completionRate: 0,
      plannedStudyTime: formatStudyDuration(0, 'planned'),
      completedStudyTime: formatStudyDuration(0, 'completed'),
      categorizedSlots: { past: [], current: null, upcoming: [] },
      nextBestAction: emptyAction,
    };
  }

  const targetDayIso = getLocalDateString(targetDate);
  const targetDayIndex = getTodayDayOfWeek();

  const todaySlots = slots.filter((s) => {
    if (s.date) {
      const datePart = s.date.split('T')[0];
      return datePart === targetDayIso;
    }
    return s.dayOfWeek === targetDayIndex;
  });

  const scheduledMinutes = todaySlots.reduce((sum, s) => sum + calculateSlotDuration(s), 0);
  const completedSlots = todaySlots.filter((s) => s.isCompleted === true);
  const completedMinutes = completedSlots.reduce((sum, s) => sum + calculateSlotDuration(s), 0);
  const completedSessions = completedSlots.length;
  const totalSessions = todaySlots.length;

  const catchUpSessions = todaySlots.filter((s) => s.isCatchUp).length;
  const highPrioritySessions = todaySlots.filter((s) => {
    const subName = resolveMobileSubjectName(s);
    const matchedPriority = priorities.find((p) => p.subjectName.toLowerCase() === subName.toLowerCase()) as PrioritySubjectMobile | undefined;
    return (
      (matchedPriority && matchedPriority.priorityLevel === 'HIGH') ||
      (s.difficultyScore != null && s.difficultyScore >= 60)
    );
  }).length;

  const completionRate = scheduledMinutes > 0 ? Math.round((completedMinutes / scheduledMinutes) * 100) : 0;

  const nowMins = targetDate.getHours() * 60 + targetDate.getMinutes();
  const pastSlots: SlotResponse[] = [];
  let currentSlot: SlotResponse | null = null;
  const upcomingSlotsList: SlotResponse[] = [];

  todaySlots.forEach((slot) => {
    if (slot.isCompleted) {
      pastSlots.push(slot);
      return;
    }
    const startMins = parseTimeToMinutes(slot.startTime);
    const endMins = parseTimeToMinutes(slot.endTime);

    if (startMins != null && endMins != null) {
      if (nowMins >= startMins && nowMins <= endMins) {
        if (!currentSlot) currentSlot = slot;
        else pastSlots.push(slot);
      } else if (nowMins < startMins) {
        upcomingSlotsList.push(slot);
      } else {
        pastSlots.push(slot);
      }
    } else {
      upcomingSlotsList.push(slot);
    }
  });

  const nextBestAction = evaluateNextBestActionMobile(todaySlots, slots, upcomingExams, priorities, targetDate);

  return {
    todaySlots,
    scheduledMinutes,
    completedMinutes,
    completedSessions,
    totalSessions,
    highPrioritySessions,
    catchUpSessions,
    completionRate,
    plannedStudyTime: formatStudyDuration(scheduledMinutes, 'planned'),
    completedStudyTime: formatStudyDuration(completedMinutes, 'completed'),
    categorizedSlots: {
      past: pastSlots,
      current: currentSlot,
      upcoming: upcomingSlotsList,
    },
    nextBestAction,
  };
}


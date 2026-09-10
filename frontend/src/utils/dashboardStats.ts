import { dayKey, slotDayKey, mondayBasedIndex, evaluateSessionState } from './dateHelpers';

export interface TimetableSlotLike {
  id?: string;
  date?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number | null;
  status?: 'pending' | 'completed' | 'skipped' | 'missed' | string;
  isCompleted?: boolean;
  isCatchUp?: boolean;
  subject?: { id?: string; name?: string; subjectName?: string; difficultyLevel?: number } | string;
  subjectName?: string;
  topic?: string;
  chapter?: string;
  difficultyScore?: number;
  difficulty?: string;
  selectionReason?: string;
  notes?: string;
}

export interface ExamLike {
  id?: string;
  examName?: string;
  examDate?: string;
  subject?: { id?: string; name?: string; subjectName?: string } | string;
  daysRemaining?: number;
}

export interface PriorityLike {
  id?: string;
  subjectName?: string;
  priorityScore?: number;
  priorityLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  averagePercentage?: number;
  daysUntilExam?: number;
  reasons?: string[];
}

export interface NextBestAction {
  type: 'ACTIVE_NOW' | 'CATCH_UP' | 'HIGH_PRIORITY' | 'UPCOMING' | 'ALL_DONE' | 'NO_PLAN';
  actionTitle: string;
  targetName: string;
  topic?: string;
  timeRange?: string;
  durationMinutes?: number;
  reasons: string[];
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  slot?: TimetableSlotLike | null;
}

export interface CategorizedDaySlots {
  past: TimetableSlotLike[];
  current: TimetableSlotLike | null;
  upcoming: TimetableSlotLike[];
}

export interface DayStudyStats {
  todaySlots: TimetableSlotLike[];
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
  categorizedSlots: CategorizedDaySlots;
  nextBestAction: NextBestAction;
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

export function resolveSubjectName(slot: TimetableSlotLike): string {
  if (typeof slot.subject === 'string') return slot.subject;
  if (slot.subject && typeof slot.subject === 'object') {
    return slot.subject.subjectName || slot.subject.name || slot.subjectName || 'Study Session';
  }
  return slot.subjectName || 'Study Session';
}

function formatSlotTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime) return 'Scheduled';
  if (!endTime) {
    try {
      return new Date(`1970-01-01T${startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return startTime;
    }
  }
  try {
    const startStr = new Date(`1970-01-01T${startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const endStr = new Date(`1970-01-01T${endTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${startStr} – ${endStr}`;
  } catch {
    return `${startTime} – ${endTime}`;
  }
}

/**
 * Evaluates the next best action for a student based on real timetable, exam, and priority signals.
 */
export function evaluateNextBestAction(
  todaySlots: TimetableSlotLike[],
  allSlots: TimetableSlotLike[] = [],
  upcomingExams: ExamLike[] = [],
  priorities: PriorityLike[] = [],
  targetDate: Date = new Date()
): NextBestAction {
  if (!todaySlots || todaySlots.length === 0) {
    if (allSlots.length > 0) {
      return {
        type: 'ALL_DONE',
        actionTitle: 'Rest & Routine Maintenance',
        targetName: 'No Sessions Scheduled Today',
        reasons: [
          'No study slots scheduled for today in your active plan',
          'Review upcoming materials or take a planned recovery break',
        ],
        primaryCta: { label: 'Open Timetable', href: '/timetable' },
        secondaryCta: { label: 'Study with AI Tutor', href: '/chat' },
      };
    }
    return {
      type: 'NO_PLAN',
      actionTitle: 'Generate Your AI Study Plan',
      targetName: 'Customized to Your Exam Deadlines',
      reasons: [
        'No active timetable found for today',
        'AI allocates daily study slots based on exam proximity and subject difficulty',
      ],
      primaryCta: { label: 'Generate Timetable', href: '/timetable/generate' },
      secondaryCta: { label: 'Add Subjects', href: '/subjects' },
    };
  }

  // Find active slot happening right now
  const activeSlot = todaySlots.find((s) => {
    const st = evaluateSessionState(s, targetDate);
    return st.isActive;
  });

  if (activeSlot) {
    const subName = resolveSubjectName(activeSlot);
    const timeStr = formatSlotTimeRange(activeSlot.startTime, activeSlot.endTime);
    const duration = calculateSlotDuration(activeSlot);
    const reasons: string[] = [`⚡ Active study window right now (${timeStr})`];

    if (activeSlot.isCatchUp) {
      reasons.push('🔴 Catch-up required from a previously missed session');
    }

    const matchedPriority = priorities.find((p) => p.subjectName?.toLowerCase() === subName.toLowerCase());
    if (matchedPriority && matchedPriority.priorityLevel === 'HIGH') {
      reasons.push(`🔥 High priority subject (Score ${matchedPriority.priorityScore || 80}/100)`);
    }

    const matchedExam = upcomingExams.find((e) => {
      const eSub = typeof e.subject === 'string' ? e.subject : e.subject?.subjectName || e.subject?.name;
      return eSub?.toLowerCase() === subName.toLowerCase();
    });
    if (matchedExam && matchedExam.daysRemaining != null) {
      reasons.push(`📝 Exam in ${matchedExam.daysRemaining} day${matchedExam.daysRemaining === 1 ? '' : 's'} (${matchedExam.examName || 'Upcoming Exam'})`);
    }

    if (activeSlot.selectionReason) {
      reasons.push(`🎯 ${activeSlot.selectionReason}`);
    }

    return {
      type: 'ACTIVE_NOW',
      actionTitle: 'Complete Active Session',
      targetName: subName,
      topic: activeSlot.topic,
      timeRange: timeStr,
      durationMinutes: duration,
      reasons,
      primaryCta: { label: 'Open in Timetable', href: '/timetable' },
      secondaryCta: { label: 'Study with AI Tutor', href: '/chat' },
      slot: activeSlot,
    };
  }

  // Find uncompleted catch-up slot today
  const catchUpSlot = todaySlots.find((s) => s.isCatchUp && !s.isCompleted && s.status !== 'completed');
  if (catchUpSlot) {
    const subName = resolveSubjectName(catchUpSlot);
    const timeStr = formatSlotTimeRange(catchUpSlot.startTime, catchUpSlot.endTime);
    const duration = calculateSlotDuration(catchUpSlot);
    const reasons: string[] = [
      '🔴 Carried forward from a previously missed study session',
      `⏳ Scheduled today: ${timeStr} (${duration}m)`,
    ];

    const matchedExam = upcomingExams.find((e) => {
      const eSub = typeof e.subject === 'string' ? e.subject : e.subject?.subjectName || e.subject?.name;
      return eSub?.toLowerCase() === subName.toLowerCase();
    });
    if (matchedExam && matchedExam.daysRemaining != null) {
      reasons.push(`📝 Exam in ${matchedExam.daysRemaining} days (${matchedExam.examName || 'Exam'})`);
    }

    return {
      type: 'CATCH_UP',
      actionTitle: 'Catch Up on Missed Session',
      targetName: subName,
      topic: catchUpSlot.topic,
      timeRange: timeStr,
      durationMinutes: duration,
      reasons,
      primaryCta: { label: 'Catch Up in Timetable', href: '/timetable' },
      secondaryCta: { label: 'Study with AI Tutor', href: '/chat' },
      slot: catchUpSlot,
    };
  }

  // Find upcoming slots today
  const upcomingSlots = todaySlots.filter((s) => {
    const st = evaluateSessionState(s, targetDate);
    return st.isUpcoming;
  });

  if (upcomingSlots.length > 0) {
    // Check if any upcoming slot has high priority
    const highPriSlot = upcomingSlots.find((s) => {
      const sub = resolveSubjectName(s);
      return priorities.some((p) => p.subjectName?.toLowerCase() === sub.toLowerCase() && p.priorityLevel === 'HIGH');
    }) || upcomingSlots[0];

    const subName = resolveSubjectName(highPriSlot);
    const timeStr = formatSlotTimeRange(highPriSlot.startTime, highPriSlot.endTime);
    const duration = calculateSlotDuration(highPriSlot);
    const reasons: string[] = [`⏳ Next session scheduled for ${timeStr} (${duration}m)`];

    const matchedPriority = priorities.find((p) => p.subjectName?.toLowerCase() === subName.toLowerCase());
    if (matchedPriority) {
      reasons.push(`🎯 Priority Level: ${matchedPriority.priorityLevel || 'NORMAL'}`);
      if (matchedPriority.averagePercentage != null && matchedPriority.averagePercentage < 65) {
        reasons.push(`📉 Recent average: ${Math.round(matchedPriority.averagePercentage)}%`);
      }
    }

    const matchedExam = upcomingExams.find((e) => {
      const eSub = typeof e.subject === 'string' ? e.subject : e.subject?.subjectName || e.subject?.name;
      return eSub?.toLowerCase() === subName.toLowerCase();
    });
    if (matchedExam && matchedExam.daysRemaining != null) {
      reasons.push(`📝 Exam in ${matchedExam.daysRemaining} days (${matchedExam.examName || 'Exam'})`);
    }

    return {
      type: matchedPriority?.priorityLevel === 'HIGH' ? 'HIGH_PRIORITY' : 'UPCOMING',
      actionTitle: matchedPriority?.priorityLevel === 'HIGH' ? 'Prepare High-Priority Session' : 'Next Up on Schedule',
      targetName: subName,
      topic: highPriSlot.topic,
      timeRange: timeStr,
      durationMinutes: duration,
      reasons,
      primaryCta: { label: 'View Session in Timetable', href: '/timetable' },
      secondaryCta: { label: 'Ask AI Tutor', href: '/chat' },
      slot: highPriSlot,
    };
  }

  // Check if all sessions for today are completed
  const completedSlots = todaySlots.filter((s) => s.status === 'completed' || s.isCompleted === true);
  if (completedSlots.length === todaySlots.length && todaySlots.length > 0) {
    const nextExam = upcomingExams[0];
    const reasons = [
      `✅ All ${todaySlots.length} study session${todaySlots.length === 1 ? '' : 's'} completed for today`,
      '🔥 Daily study streak maintained',
    ];
    if (nextExam && nextExam.daysRemaining != null) {
      reasons.push(`📝 Nearest Exam: ${nextExam.examName || 'Exam'} in ${nextExam.daysRemaining} days`);
    }

    return {
      type: 'ALL_DONE',
      actionTitle: 'Daily Study Goals Completed! 🎉',
      targetName: 'All Sessions Finished',
      reasons,
      primaryCta: { label: 'View Calendar', href: '/timetable' },
      secondaryCta: { label: 'Check Performance', href: '/performance' },
    };
  }

  // Fallback
  return {
    type: 'UPCOMING',
    actionTitle: 'Review Study Schedule',
    targetName: 'Today\'s Study Plan',
    reasons: ['Check your upcoming timetable slots'],
    primaryCta: { label: 'Open Timetable', href: '/timetable' },
    secondaryCta: { label: 'Study with AI Tutor', href: '/chat' },
  };
}

/**
 * Filter slots for a given calendar date and computes canonical scheduled & completed metrics.
 */
export function computeDayStudyStats(
  slots?: TimetableSlotLike[] | null,
  targetDate: Date = new Date(),
  upcomingExams: ExamLike[] = [],
  priorities: PriorityLike[] = []
): DayStudyStats {
  if (!slots || !Array.isArray(slots) || slots.length === 0) {
    const emptyAction = evaluateNextBestAction([], [], upcomingExams, priorities, targetDate);
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

  const catchUpSessions = todaySlots.filter((s) => s.isCatchUp).length;

  const highPrioritySessions = todaySlots.filter((s) => {
    const subName = resolveSubjectName(s);
    const matchedPriority = priorities.find((p) => p.subjectName?.toLowerCase() === subName.toLowerCase());
    return (
      (matchedPriority && matchedPriority.priorityLevel === 'HIGH') ||
      (s.difficultyScore != null && s.difficultyScore >= 60) ||
      (typeof s.subject === 'object' && s.subject?.difficultyLevel != null && s.subject.difficultyLevel >= 4)
    );
  }).length;

  const completionRate = scheduledMinutes > 0 ? Math.round((completedMinutes / scheduledMinutes) * 100) : 0;

  // Categorize slots into past, current, upcoming
  const pastSlots: TimetableSlotLike[] = [];
  let currentSlot: TimetableSlotLike | null = null;
  const upcomingSlotsList: TimetableSlotLike[] = [];

  todaySlots.forEach((slot) => {
    const stateEval = evaluateSessionState(slot, targetDate);
    if (stateEval.isCompleted) {
      pastSlots.push(slot);
    } else if (stateEval.isActive) {
      if (!currentSlot) currentSlot = slot;
      else pastSlots.push(slot);
    } else if (stateEval.isUpcoming) {
      upcomingSlotsList.push(slot);
    } else {
      pastSlots.push(slot); // e.g. missed past deadline
    }
  });

  const nextBestAction = evaluateNextBestAction(todaySlots, slots, upcomingExams, priorities, targetDate);

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


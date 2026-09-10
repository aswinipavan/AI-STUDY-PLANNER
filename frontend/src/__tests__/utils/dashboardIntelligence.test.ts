import {
  evaluateNextBestAction,
  computeDayStudyStats,
  TimetableSlotLike,
  ExamLike,
  PriorityLike,
} from '@/utils/dashboardStats';
import { dayKey } from '@/utils/dateHelpers';

describe('Intelligent Student Dashboard Decision Engine', () => {
  const fixedToday = new Date('2026-09-09T14:30:00'); // 2:30 PM
  const todayIso = dayKey(fixedToday); // "2026-09-09"

  const mockExams: ExamLike[] = [
    {
      id: 'exam-1',
      examName: 'Discrete Mathematics Final',
      subject: { name: 'Mathematics' },
      daysRemaining: 4,
      examDate: '2026-09-13',
    },
  ];

  const mockPriorities: PriorityLike[] = [
    {
      id: 'p-1',
      subjectName: 'Mathematics',
      priorityLevel: 'HIGH',
      priorityScore: 88,
      averagePercentage: 58,
      reasons: ['Low assessment average: 58%'],
    },
    {
      id: 'p-2',
      subjectName: 'Operating Systems',
      priorityLevel: 'MEDIUM',
      priorityScore: 65,
      averagePercentage: 74,
    },
  ];

  test('1. Generates ACTIVE_NOW Next Best Action during active session window with real reasons', () => {
    const activeSlot: TimetableSlotLike = {
      id: 'slot-active',
      date: todayIso,
      startTime: '14:00',
      endTime: '15:00', // 2:00 PM - 3:00 PM covers 2:30 PM
      durationMinutes: 60,
      status: 'pending',
      isCompleted: false,
      subject: { name: 'Mathematics' },
      topic: 'Graph Theory & Trees',
      selectionReason: 'Exam in 4 days',
    };

    const nextAction = evaluateNextBestAction([activeSlot], [activeSlot], mockExams, mockPriorities, fixedToday);
    expect(nextAction.type).toBe('ACTIVE_NOW');
    expect(nextAction.actionTitle).toBe('Complete Active Session');
    expect(nextAction.targetName).toBe('Mathematics');
    expect(nextAction.topic).toBe('Graph Theory & Trees');
    expect(nextAction.reasons.some((r) => r.includes('Active study window'))).toBe(true);
    expect(nextAction.reasons.some((r) => r.includes('High priority subject'))).toBe(true);
    expect(nextAction.reasons.some((r) => r.includes('Exam in 4 days'))).toBe(true);
    expect(nextAction.primaryCta.href).toBe('/timetable');
    expect(nextAction.secondaryCta?.href).toBe('/chat');
  });

  test('2. Generates CATCH_UP Next Best Action when an uncompleted catch-up slot exists', () => {
    const upcomingCatchUpSlot: TimetableSlotLike = {
      id: 'slot-catchup',
      date: todayIso,
      startTime: '17:00',
      endTime: '18:00',
      durationMinutes: 60,
      status: 'pending',
      isCompleted: false,
      isCatchUp: true,
      subject: { name: 'Operating Systems' },
      topic: 'Semaphore Synchronization',
    };

    const nextAction = evaluateNextBestAction([upcomingCatchUpSlot], [upcomingCatchUpSlot], mockExams, mockPriorities, fixedToday);
    expect(nextAction.type).toBe('CATCH_UP');
    expect(nextAction.actionTitle).toBe('Catch Up on Missed Session');
    expect(nextAction.targetName).toBe('Operating Systems');
    expect(nextAction.reasons.some((r) => r.includes('previously missed'))).toBe(true);
  });

  test('3. Generates HIGH_PRIORITY Next Best Action for upcoming high priority slot', () => {
    const upcomingHighPriSlot: TimetableSlotLike = {
      id: 'slot-high-pri',
      date: todayIso,
      startTime: '17:00',
      endTime: '18:00',
      durationMinutes: 60,
      status: 'pending',
      isCompleted: false,
      subject: { name: 'Mathematics' },
      topic: 'Probability & Bayes Theorem',
    };

    const nextAction = evaluateNextBestAction([upcomingHighPriSlot], [upcomingHighPriSlot], mockExams, mockPriorities, fixedToday);
    expect(nextAction.type).toBe('HIGH_PRIORITY');
    expect(nextAction.actionTitle).toBe('Prepare High-Priority Session');
    expect(nextAction.targetName).toBe('Mathematics');
    expect(nextAction.reasons.some((r) => r.includes('Priority Level: HIGH'))).toBe(true);
    expect(nextAction.reasons.some((r) => r.includes('Recent average: 58%'))).toBe(true);
  });

  test('4. Generates ALL_DONE Next Best Action when all daily slots are completed', () => {
    const completedSlot: TimetableSlotLike = {
      id: 'slot-done',
      date: todayIso,
      startTime: '10:00',
      endTime: '11:00',
      durationMinutes: 60,
      status: 'completed',
      isCompleted: true,
      subject: { name: 'Mathematics' },
    };

    const nextAction = evaluateNextBestAction([completedSlot], [completedSlot], mockExams, mockPriorities, fixedToday);
    expect(nextAction.type).toBe('ALL_DONE');
    expect(nextAction.actionTitle).toContain('Daily Study Goals Completed');
    expect(nextAction.reasons.some((r) => r.includes('All 1 study session completed'))).toBe(true);
  });

  test('5. Categorizes slots cleanly into past, current, and upcoming', () => {
    const slots: TimetableSlotLike[] = [
      {
        id: 'slot-past',
        date: todayIso,
        startTime: '09:00',
        endTime: '10:00',
        status: 'completed',
        isCompleted: true,
        subject: { name: 'Mathematics' },
      },
      {
        id: 'slot-current',
        date: todayIso,
        startTime: '14:00',
        endTime: '15:00', // active at 14:30
        status: 'pending',
        isCompleted: false,
        subject: { name: 'Operating Systems' },
      },
      {
        id: 'slot-upcoming',
        date: todayIso,
        startTime: '18:00',
        endTime: '19:00',
        status: 'pending',
        isCompleted: false,
        subject: { name: 'Computer Networks' },
      },
    ];

    const stats = computeDayStudyStats(slots, fixedToday, mockExams, mockPriorities);
    expect(stats.categorizedSlots.past.length).toBe(1);
    expect(stats.categorizedSlots.past[0].id).toBe('slot-past');
    expect(stats.categorizedSlots.current?.id).toBe('slot-current');
    expect(stats.categorizedSlots.upcoming.length).toBe(1);
    expect(stats.categorizedSlots.upcoming[0].id).toBe('slot-upcoming');
    expect(stats.highPrioritySessions).toBe(1); // Mathematics (HIGH)
    expect(stats.completionRate).toBe(33); // 60 completed / 180 planned = 33%
  });
});

import {
  calculateSlotDuration,
  formatStudyDuration,
  computeDayStudyStats,
  TimetableSlotLike,
} from '@/utils/dashboardStats';
import { dayKey } from '@/utils/dateHelpers';

describe('Dashboard Study Hours & Statistics Synchronisation (Cases A-H)', () => {
  const fixedToday = new Date('2026-08-31T10:00:00');
  const todayIso = dayKey(fixedToday); // "2026-08-31"

  // ── CASE A: 1 session x 60 min pending ──
  test('CASE A: 1 session x 60 min pending -> scheduled = 60 min, completed = 0 min, completed sessions = 0', () => {
    const slots: TimetableSlotLike[] = [
      {
        id: 'slot-1',
        date: todayIso,
        startTime: '17:00',
        endTime: '18:00',
        durationMinutes: 60,
        status: 'pending',
        isCompleted: false,
        subject: { name: 'Applied Maths' },
      },
    ];

    const stats = computeDayStudyStats(slots, fixedToday);
    expect(stats.scheduledMinutes).toBe(60);
    expect(stats.completedMinutes).toBe(0);
    expect(stats.completedSessions).toBe(0);
    expect(stats.totalSessions).toBe(1);
    expect(stats.plannedStudyTime).toEqual({
      value: '1h',
      unit: 'planned',
      formatted: '1h planned',
    });
    expect(stats.completedStudyTime).toEqual({
      value: '0',
      unit: 'completed',
      formatted: '0 completed',
    });
  });

  // ── CASE B: 1 session x 60 min completed ──
  test('CASE B: 1 session x 60 min completed -> scheduled = 60 min, completed = 60 min, completed sessions = 1', () => {
    const slots: TimetableSlotLike[] = [
      {
        id: 'slot-1',
        date: todayIso,
        startTime: '17:00',
        endTime: '18:00',
        durationMinutes: 60,
        status: 'completed',
        isCompleted: true,
        subject: { name: 'Applied Maths' },
      },
    ];

    const stats = computeDayStudyStats(slots, fixedToday);
    expect(stats.scheduledMinutes).toBe(60);
    expect(stats.completedMinutes).toBe(60);
    expect(stats.completedSessions).toBe(1);
    expect(stats.totalSessions).toBe(1);
    expect(stats.plannedStudyTime.value).toBe('1h');
    expect(stats.completedStudyTime.value).toBe('1h');
  });

  // ── CASE C: 2 sessions (60 + 90 min) ──
  test('CASE C: 2 sessions (60 + 90 min) -> scheduled = 150 min (2.5h planned)', () => {
    const slots: TimetableSlotLike[] = [
      {
        id: 'slot-1',
        date: todayIso,
        startTime: '17:00',
        endTime: '18:00',
        durationMinutes: 60,
        status: 'pending',
        subject: { name: 'Applied Maths' },
      },
      {
        id: 'slot-2',
        date: todayIso,
        startTime: '18:10',
        endTime: '19:40',
        durationMinutes: 90,
        status: 'pending',
        subject: { name: 'Data Structures' },
      },
    ];

    const stats = computeDayStudyStats(slots, fixedToday);
    expect(stats.scheduledMinutes).toBe(150);
    expect(stats.totalSessions).toBe(2);
    expect(stats.completedSessions).toBe(0);
    expect(stats.plannedStudyTime).toEqual({
      value: '2.5h',
      unit: 'planned',
      formatted: '2.5h planned',
    });
  });

  // ── CASE D: one completed + one pending ──
  test('CASE D: one completed (60m) + one pending (90m) -> scheduled = 150 min, completed = 60 min', () => {
    const slots: TimetableSlotLike[] = [
      {
        id: 'slot-1',
        date: todayIso,
        startTime: '17:00',
        endTime: '18:00',
        durationMinutes: 60,
        status: 'completed',
        subject: { name: 'Applied Maths' },
      },
      {
        id: 'slot-2',
        date: todayIso,
        startTime: '18:10',
        endTime: '19:40',
        durationMinutes: 90,
        status: 'pending',
        subject: { name: 'Data Structures' },
      },
    ];

    const stats = computeDayStudyStats(slots, fixedToday);
    expect(stats.scheduledMinutes).toBe(150);
    expect(stats.completedMinutes).toBe(60);
    expect(stats.completedSessions).toBe(1);
    expect(stats.totalSessions).toBe(2);
    expect(stats.plannedStudyTime.value).toBe('2.5h');
    expect(stats.completedStudyTime.value).toBe('1h');
  });

  // ── CASE E: no sessions today ──
  test('CASE E: no sessions today -> all values = 0 with clean empty states', () => {
    const statsEmpty = computeDayStudyStats([], fixedToday);
    expect(statsEmpty.scheduledMinutes).toBe(0);
    expect(statsEmpty.completedMinutes).toBe(0);
    expect(statsEmpty.completedSessions).toBe(0);
    expect(statsEmpty.totalSessions).toBe(0);
    expect(statsEmpty.plannedStudyTime).toEqual({
      value: '0',
      unit: 'planned',
      formatted: '0 planned',
    });

    const statsNull = computeDayStudyStats(null, fixedToday);
    expect(statsNull.scheduledMinutes).toBe(0);
  });

  // ── CASE F: date boundary and timezone behavior ──
  test('CASE F: date boundary and timezone behavior (ignores yesterday and tomorrow)', () => {
    const slots: TimetableSlotLike[] = [
      {
        id: 'slot-yesterday',
        date: '2026-08-30',
        startTime: '17:00',
        endTime: '18:00',
        durationMinutes: 60,
        status: 'completed',
      },
      {
        id: 'slot-today',
        date: todayIso,
        startTime: '17:00',
        endTime: '18:00',
        durationMinutes: 60,
        status: 'pending',
      },
      {
        id: 'slot-tomorrow',
        date: '2026-09-01',
        startTime: '17:00',
        endTime: '18:00',
        durationMinutes: 60,
        status: 'pending',
      },
    ];

    const stats = computeDayStudyStats(slots, fixedToday);
    expect(stats.todaySlots.length).toBe(1);
    expect(stats.todaySlots[0].id).toBe('slot-today');
    expect(stats.scheduledMinutes).toBe(60);
    expect(stats.completedMinutes).toBe(0);
  });

  // ── CASE G: 45-minute and 90-minute sessions and custom durations ──
  test('CASE G: 45-minute and 90-minute sessions and custom durations', () => {
    expect(calculateSlotDuration({ startTime: '10:00', endTime: '10:45' })).toBe(45);
    expect(calculateSlotDuration({ startTime: '14:00', endTime: '15:30' })).toBe(90);
    expect(calculateSlotDuration({ startTime: '23:30', endTime: '00:30' })).toBe(60); // crosses midnight
    expect(calculateSlotDuration({ durationMinutes: 45 })).toBe(45);

    expect(formatStudyDuration(45, 'planned')).toEqual({
      value: '45m',
      unit: 'planned',
      formatted: '45m planned',
    });
    expect(formatStudyDuration(90, 'planned')).toEqual({
      value: '1.5h',
      unit: 'planned',
      formatted: '1.5h planned',
    });
    expect(formatStudyDuration(75, 'planned')).toEqual({
      value: '1h 15m',
      unit: 'planned',
      formatted: '1h 15m planned',
    });
    expect(formatStudyDuration(120, 'planned')).toEqual({
      value: '2h',
      unit: 'planned',
      formatted: '2h planned',
    });
  });

  // ── CASE H: dashboard refresh after completing a session ──
  test('CASE H: dashboard refresh after completing a session recalculates immediately', () => {
    const initialSlots: TimetableSlotLike[] = [
      {
        id: 'slot-1',
        date: todayIso,
        startTime: '17:00',
        endTime: '18:00',
        durationMinutes: 60,
        status: 'pending',
      },
    ];

    const beforeState = computeDayStudyStats(initialSlots, fixedToday);
    expect(beforeState.completedSessions).toBe(0);
    expect(beforeState.completedMinutes).toBe(0);

    // Simulate user toggling session to completed
    const updatedSlots: TimetableSlotLike[] = initialSlots.map((s) => ({
      ...s,
      status: 'completed',
      isCompleted: true,
    }));

    const afterState = computeDayStudyStats(updatedSlots, fixedToday);
    expect(afterState.completedSessions).toBe(1);
    expect(afterState.completedMinutes).toBe(60);
    expect(afterState.scheduledMinutes).toBe(60); // Scheduled time remains preserved
  });
});

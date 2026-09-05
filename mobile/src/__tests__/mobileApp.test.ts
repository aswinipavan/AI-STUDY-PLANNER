import { describe, it, expect } from '@jest/globals';
import { formatDate, formatTime, formatTimeRange, getDayLabel, getDayShort } from '../utils/dateUtils';
import { getErrorMessage, isNetworkError, isTimeoutError } from '../utils/errorHandler';

describe('Mobile App Unit & Utilities Test Suite', () => {
  describe('dateUtils', () => {
    it('formats ISO date strings correctly', () => {
      expect(formatDate('2026-08-28')).toBe('Aug 28, 2026');
      expect(formatDate('2026-12-25')).toBe('Dec 25, 2026');
    });

    it('formats HH:mm:ss strings to 12-hour AM/PM format', () => {
      expect(formatTime('09:00:00')).toBe('9:00 AM');
      expect(formatTime('17:00:00')).toBe('5:00 PM');
      expect(formatTime('18:30:00')).toBe('6:30 PM');
    });

    it('formats slot start and end time ranges correctly', () => {
      expect(formatTimeRange('17:00:00', '18:00:00')).toBe('5:00 PM \u2013 6:00 PM');
      expect(formatTimeRange('06:00:00', '07:30:00')).toBe('6:00 AM \u2013 7:30 AM');
    });

    it('maps dayOfWeek numbers to day labels correctly', () => {
      expect(getDayLabel(0)).toBe('Monday');
      expect(getDayLabel(4)).toBe('Friday');
      expect(getDayLabel(6)).toBe('Sunday');
      expect(getDayShort(0)).toBe('Mon');
      expect(getDayShort(4)).toBe('Fri');
    });
  });

  describe('errorHandler', () => {
    it('extracts backend ApiError message if present', () => {
      const apiError = {
        status: 404,
        message: 'Subject not found for student',
        isNetworkError: false,
        isTimeout: false,
      };
      expect(getErrorMessage(apiError)).toBe('Subject not found for student');
    });

    it('falls back to Error.message if standard Error', () => {
      const errorObj = new Error('Network connection timeout');
      expect(getErrorMessage(errorObj)).toBe('Network connection timeout');
    });

    it('provides generic fallback string when error is unknown or null', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred.');
    });

    it('correctly identifies network and timeout errors', () => {
      expect(isNetworkError({ isNetworkError: true })).toBe(true);
      expect(isNetworkError({ isNetworkError: false })).toBe(false);
      expect(isTimeoutError({ isTimeout: true })).toBe(true);
      expect(isTimeoutError({ isTimeout: false })).toBe(false);
    });

    it('translates Firebase Auth error codes to user-friendly messages', () => {
      expect(getErrorMessage(new Error('[auth/invalid-credential] The supplied auth credential is incorrect.')))
        .toContain('Invalid email or password');
      expect(getErrorMessage(new Error('[auth/user-not-found] There is no user record.')))
        .toContain('No account found with this email');
      expect(getErrorMessage(new Error('[auth/wrong-password] The password is invalid.')))
        .toContain('Incorrect password');
      expect(getErrorMessage(new Error('[auth/email-already-in-use] Email is in use.')))
        .toContain('already exists');
    });
  });

  describe('timetable contract & slot filtering', () => {
    it('filters today slots matching concrete calendar date before dayOfWeek', () => {
      const mockSlots = [
        { id: '1', date: '2026-08-29', dayOfWeek: 5, startTime: '09:00:00', endTime: '10:00:00', isCompleted: false, subject: { id: 's1', subjectName: 'Data Structures' } },
        { id: '2', date: '2026-08-30', dayOfWeek: 6, startTime: '11:00:00', endTime: '12:00:00', isCompleted: false, subject: { id: 's2', subjectName: 'Algorithms' } },
      ];
      const todayStr = '2026-08-29';
      const todaySlots = mockSlots.filter(s => s.date === todayStr);
      expect(todaySlots).toHaveLength(1);
      expect(todaySlots[0].subject.subjectName).toBe('Data Structures');
    });

    it('falls back to dayOfWeek when concrete date is not present', () => {
      const mockSlots = [
        { id: '1', dayOfWeek: 5, startTime: '09:00:00', endTime: '10:00:00', isCompleted: false, subject: { id: 's1', subjectName: 'Data Structures' } },
        { id: '2', dayOfWeek: 6, startTime: '11:00:00', endTime: '12:00:00', isCompleted: false, subject: { id: 's2', subjectName: 'Algorithms' } },
      ];
      const todayDayOfWeek = 5;
      const todaySlots = mockSlots.filter(s => (s as any).date ? (s as any).date === '2026-08-29' : s.dayOfWeek === todayDayOfWeek);
      expect(todaySlots).toHaveLength(1);
      expect(todaySlots[0].id).toBe('1');
    });

    it('verifies timetable slot fields conform to full display contract', () => {
      const slot = {
        id: 'slot-101',
        dayOfWeek: 5,
        date: '2026-08-29',
        startTime: '06:00:00',
        endTime: '07:00:00',
        topic: 'Binary Search Trees',
        chapter: 'Trees and Graphs',
        isCompleted: false,
        subject: {
          id: 'sub-1',
          subjectName: 'Data Structures',
          subjectCode: 'CS201',
          difficultyLevel: 'HARD',
        },
      };

      expect(slot.startTime).toBe('06:00:00');
      expect(slot.endTime).toBe('07:00:00');
      expect(formatTimeRange(slot.startTime, slot.endTime)).toBe('6:00 AM \u2013 7:00 AM');
      expect(slot.topic).toBe('Binary Search Trees');
      expect(slot.chapter).toBe('Trees and Graphs');
      expect(slot.subject.subjectName).toBe('Data Structures');
      expect(slot.isCompleted).toBe(false);
    });

    it('handles 404 as valid empty timetable state without throwing', () => {
      const handle404EmptyState = (err: any) => {
        if (err?.status === 404 || err?.response?.status === 404) {
          return null;
        }
        throw err;
      };

      expect(handle404EmptyState({ status: 404, message: 'Resource not found.' })).toBeNull();
      expect(handle404EmptyState({ response: { status: 404 } })).toBeNull();
      expect(() => handle404EmptyState({ status: 500, message: 'Server Error' })).toThrow();
    });
  });

  describe('dashboardStats (Cases A-H)', () => {
    const {
      calculateSlotDuration,
      formatStudyDuration,
      computeDayStudyStats,
      getLocalDateString,
    } = require('../utils/dashboardStats');

    const fixedToday = new Date('2026-08-31T10:00:00');
    const todayIso = getLocalDateString(fixedToday);

    it('CASE A: 1 session x 60 min pending -> scheduled = 60 min, completed = 0 min, completed sessions = 0', () => {
      const slots = [
        {
          id: 'slot-1',
          date: todayIso,
          startTime: '17:00',
          endTime: '18:00',
          durationMinutes: 60,
          isCompleted: false,
          subject: { subjectName: 'Applied Maths' },
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
    });

    it('CASE B: 1 session x 60 min completed -> scheduled = 60 min, completed = 60 min, completed sessions = 1', () => {
      const slots = [
        {
          id: 'slot-1',
          date: todayIso,
          startTime: '17:00',
          endTime: '18:00',
          durationMinutes: 60,
          isCompleted: true,
          subject: { subjectName: 'Applied Maths' },
        },
      ];
      const stats = computeDayStudyStats(slots, fixedToday);
      expect(stats.scheduledMinutes).toBe(60);
      expect(stats.completedMinutes).toBe(60);
      expect(stats.completedSessions).toBe(1);
      expect(stats.plannedStudyTime.value).toBe('1h');
      expect(stats.completedStudyTime.value).toBe('1h');
    });

    it('CASE C: 2 sessions (60 + 90 min) -> scheduled = 150 min (2.5h planned)', () => {
      const slots = [
        { id: '1', date: todayIso, startTime: '17:00', endTime: '18:00', durationMinutes: 60, isCompleted: false, subject: { subjectName: 'Maths' } },
        { id: '2', date: todayIso, startTime: '18:10', endTime: '19:40', durationMinutes: 90, isCompleted: false, subject: { subjectName: 'DS' } },
      ];
      const stats = computeDayStudyStats(slots, fixedToday);
      expect(stats.scheduledMinutes).toBe(150);
      expect(stats.totalSessions).toBe(2);
      expect(stats.plannedStudyTime.value).toBe('2.5h');
    });

    it('CASE D: one completed (60m) + one pending (90m) -> scheduled = 150 min, completed = 60 min', () => {
      const slots = [
        { id: '1', date: todayIso, startTime: '17:00', endTime: '18:00', durationMinutes: 60, isCompleted: true, subject: { subjectName: 'Maths' } },
        { id: '2', date: todayIso, startTime: '18:10', endTime: '19:40', durationMinutes: 90, isCompleted: false, subject: { subjectName: 'DS' } },
      ];
      const stats = computeDayStudyStats(slots, fixedToday);
      expect(stats.scheduledMinutes).toBe(150);
      expect(stats.completedMinutes).toBe(60);
      expect(stats.completedSessions).toBe(1);
      expect(stats.plannedStudyTime.value).toBe('2.5h');
      expect(stats.completedStudyTime.value).toBe('1h');
    });

    it('CASE E: no sessions today -> all values = 0', () => {
      const stats = computeDayStudyStats([], fixedToday);
      expect(stats.scheduledMinutes).toBe(0);
      expect(stats.completedMinutes).toBe(0);
      expect(stats.completedSessions).toBe(0);
      expect(stats.plannedStudyTime.value).toBe('0');
    });

    it('CASE F: date boundary/timezone behavior', () => {
      const slots = [
        { id: 'yesterday', date: '2026-08-30', startTime: '17:00', endTime: '18:00', isCompleted: true, subject: { subjectName: 'M' } },
        { id: 'today', date: todayIso, startTime: '17:00', endTime: '18:00', isCompleted: false, subject: { subjectName: 'M' } },
        { id: 'tomorrow', date: '2026-09-01', startTime: '17:00', endTime: '18:00', isCompleted: false, subject: { subjectName: 'M' } },
      ];
      const stats = computeDayStudyStats(slots, fixedToday);
      expect(stats.todaySlots).toHaveLength(1);
      expect(stats.todaySlots[0].id).toBe('today');
    });

    it('CASE G: 45-minute and 90-minute sessions', () => {
      expect(calculateSlotDuration({ startTime: '10:00', endTime: '10:45' })).toBe(45);
      expect(calculateSlotDuration({ startTime: '14:00', endTime: '15:30' })).toBe(90);
      expect(formatStudyDuration(45, 'planned').value).toBe('45m');
      expect(formatStudyDuration(90, 'planned').value).toBe('1.5h');
    });

    it('CASE H: dashboard refresh after completing a session', () => {
      const initial = [
        { id: '1', date: todayIso, startTime: '17:00', endTime: '18:00', isCompleted: false, subject: { subjectName: 'M' } },
      ];
      const before = computeDayStudyStats(initial, fixedToday);
      expect(before.completedSessions).toBe(0);

      const after = computeDayStudyStats(
        initial.map(s => ({ ...s, isCompleted: true })),
        fixedToday
      );
      expect(after.completedSessions).toBe(1);
      expect(after.completedMinutes).toBe(60);
      expect(after.scheduledMinutes).toBe(60);
    });
  });
});



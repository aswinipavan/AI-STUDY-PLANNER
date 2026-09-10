import {
  formatHoursAndMinutes,
  computeDayStudyCapacity,
} from '@/utils/dateHelpers';

describe('Timetable Capacity & Duration Formatting Tests', () => {
  describe('formatHoursAndMinutes', () => {
    test('formats 0 or negative minutes as 0m', () => {
      expect(formatHoursAndMinutes(0)).toBe('0m');
      expect(formatHoursAndMinutes(-15)).toBe('0m');
    });

    test('formats sub-hour minutes', () => {
      expect(formatHoursAndMinutes(30)).toBe('30m');
      expect(formatHoursAndMinutes(45)).toBe('45m');
      expect(formatHoursAndMinutes(59)).toBe('59m');
    });

    test('formats exact hours', () => {
      expect(formatHoursAndMinutes(60)).toBe('1h');
      expect(formatHoursAndMinutes(120)).toBe('2h');
      expect(formatHoursAndMinutes(180)).toBe('3h');
    });

    test('formats combined hours and minutes', () => {
      expect(formatHoursAndMinutes(75)).toBe('1h 15m');
      expect(formatHoursAndMinutes(90)).toBe('1h 30m');
      expect(formatHoursAndMinutes(150)).toBe('2h 30m');
    });
  });

  describe('computeDayStudyCapacity', () => {
    test('computes capacity with under-allocated slots', () => {
      const slots = [
        { startTime: '17:00', endTime: '18:00' }, // 60m
      ];
      const result = computeDayStudyCapacity(2, slots); // 120m capacity

      expect(result.capacityMinutes).toBe(120);
      expect(result.scheduledMinutes).toBe(60);
      expect(result.remainingMinutes).toBe(60);
      expect(result.isOverAllocated).toBe(false);
      expect(result.utilizationPercent).toBe(50);
      expect(result.capacityFormatted).toBe('2h');
      expect(result.scheduledFormatted).toBe('1h');
      expect(result.remainingFormatted).toBe('1h');
    });

    test('computes capacity with exactly full allocation', () => {
      const slots = [
        { startTime: '17:00', endTime: '18:00' }, // 60m
        { startTime: '18:00', endTime: '19:00' }, // 60m
      ];
      const result = computeDayStudyCapacity(2, slots);

      expect(result.capacityMinutes).toBe(120);
      expect(result.scheduledMinutes).toBe(120);
      expect(result.remainingMinutes).toBe(0);
      expect(result.isOverAllocated).toBe(false);
      expect(result.utilizationPercent).toBe(100);
      expect(result.capacityFormatted).toBe('2h');
      expect(result.scheduledFormatted).toBe('2h');
      expect(result.remainingFormatted).toBe('0m');
    });

    test('computes capacity with over-allocated slots', () => {
      const slots = [
        { durationMinutes: 90 },
        { durationMinutes: 60 },
      ];
      const result = computeDayStudyCapacity(2, slots); // 120m cap vs 150m sched

      expect(result.capacityMinutes).toBe(120);
      expect(result.scheduledMinutes).toBe(150);
      expect(result.remainingMinutes).toBe(0);
      expect(result.isOverAllocated).toBe(true);
      expect(result.utilizationPercent).toBe(125);
      expect(result.scheduledFormatted).toBe('2h 30m');
    });

    test('handles empty slot list gracefully', () => {
      const result = computeDayStudyCapacity(3, []);

      expect(result.capacityMinutes).toBe(180);
      expect(result.scheduledMinutes).toBe(0);
      expect(result.remainingMinutes).toBe(180);
      expect(result.isOverAllocated).toBe(false);
      expect(result.utilizationPercent).toBe(0);
      expect(result.capacityFormatted).toBe('3h');
      expect(result.remainingFormatted).toBe('3h');
    });

    test('handles overnight slot times crossing midnight', () => {
      const slots = [
        { startTime: '23:30', endTime: '01:00' }, // 90m
      ];
      const result = computeDayStudyCapacity(2, slots);

      expect(result.scheduledMinutes).toBe(90);
      expect(result.remainingMinutes).toBe(30);
      expect(result.scheduledFormatted).toBe('1h 30m');
      expect(result.remainingFormatted).toBe('30m');
    });
  });
});

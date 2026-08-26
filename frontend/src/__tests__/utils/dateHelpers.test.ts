/**
 * Regression tests for two silent defects that TypeScript could not catch, because
 * the declared `Subject` type disagreed with what the API actually sends.
 *
 *  1. "Today's Schedule" matched slots by *weekday label*, so every same-weekday
 *     session from the other weeks of a multi-week plan counted as "today".
 *  2. The subject nested inside a timetable slot arrives as `subjectName`, but the
 *     whole frontend reads `subject.name` — so it was always `undefined` and every
 *     slot rendered the "Study Session" / "Study" placeholder.
 */
import { dayKey, parseSlotDate, slotDayKey, mondayBasedIndex } from '@/utils/dateHelpers';

describe('dateHelpers', () => {
  describe('parseSlotDate', () => {
    it('parses a backend LocalDate as local midnight, not UTC midnight', () => {
      const parsed = parseSlotDate('2026-08-24');
      expect(parsed).not.toBeNull();
      // The bug: new Date('2026-08-24') is UTC midnight, which is Aug 23 west of UTC.
      expect(parsed!.getFullYear()).toBe(2026);
      expect(parsed!.getMonth()).toBe(7); // August, zero-based
      expect(parsed!.getDate()).toBe(24);
    });

    it('tolerates a full timestamp and rejects junk', () => {
      expect(parseSlotDate('2026-08-24T10:30:00')!.getDate()).toBe(24);
      expect(parseSlotDate('not-a-date')).toBeNull();
    });
  });

  describe('dayKey', () => {
    it('zero-pads to a string-comparable local calendar day', () => {
      expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
      // String ordering must match chronological ordering — `missedSlots` relies on it.
      expect(dayKey(new Date(2026, 7, 9)) < dayKey(new Date(2026, 7, 24))).toBe(true);
    });
  });

  describe('slotDayKey', () => {
    it('round-trips a slot date without shifting the day', () => {
      expect(slotDayKey('2026-08-24')).toBe('2026-08-24');
    });

    it('returns null for a slot that carries no date', () => {
      expect(slotDayKey(undefined)).toBeNull();
    });
  });

  it('mondayBasedIndex maps Monday to 0 and Sunday to 6', () => {
    expect(mondayBasedIndex(new Date(2026, 7, 24))).toBe(0); // a Monday
    expect(mondayBasedIndex(new Date(2026, 7, 30))).toBe(6); // the Sunday after
  });

  it('only today\'s calendar date counts as today, not every same weekday', () => {
    const today = new Date(2026, 7, 24); // Monday
    const todayIso = dayKey(today);
    const slots = [
      { id: 'a', date: '2026-08-24', dayOfWeek: 0 }, // today
      { id: 'b', date: '2026-08-31', dayOfWeek: 0 }, // next Monday — must NOT match
      { id: 'c', date: '2026-09-07', dayOfWeek: 0 }, // the Monday after — must NOT match
      { id: 'd', date: undefined, dayOfWeek: 0 }, // dateless: weekday fallback applies
    ];

    const matched = slots.filter((s) => {
      const iso = slotDayKey(s.date);
      return iso ? iso === todayIso : s.dayOfWeek === mondayBasedIndex(today);
    });

    expect(matched.map((s) => s.id)).toEqual(['a', 'd']);
  });
});

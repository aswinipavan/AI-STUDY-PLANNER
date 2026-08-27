/**
 * Unit tests for studyPeriodUtils.ts
 *
 * Regression tests for requirements A–D plus edge cases listed in the spec.
 */
import {
  calcStudyPeriod,
  formatTime,
  WINDOW_START_TIMES,
  LABEL_TO_ENUM,
  ENUM_TO_LABEL,
} from '@/utils/studyPeriodUtils';

// ─── formatTime ──────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats 17:00 as 5:00 PM', () => {
    expect(formatTime('17:00')).toBe('5:00 PM');
  });

  it('formats 06:00 as 6:00 AM', () => {
    expect(formatTime('06:00')).toBe('6:00 AM');
  });

  it('formats 12:00 as 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('formats 21:00 as 9:00 PM', () => {
    expect(formatTime('21:00')).toBe('9:00 PM');
  });
});

// ─── Canonical start times must match Java StudyTimeWindow exactly ────────────

describe('WINDOW_START_TIMES', () => {
  it('MORNING starts at 06:00', () => expect(WINDOW_START_TIMES.MORNING).toBe('06:00'));
  it('AFTERNOON starts at 12:00', () => expect(WINDOW_START_TIMES.AFTERNOON).toBe('12:00'));
  it('EVENING starts at 17:00', () => expect(WINDOW_START_TIMES.EVENING).toBe('17:00'));
  it('LATE_NIGHT starts at 21:00', () => expect(WINDOW_START_TIMES.LATE_NIGHT).toBe('21:00'));
});

// ─── Label round-trip ─────────────────────────────────────────────────────────

describe('label ↔ enum round-trip', () => {
  it('EVENING → "5:00 PM" → EVENING', () => {
    const label = ENUM_TO_LABEL['EVENING'];
    expect(label).toBe('5:00 PM');
    expect(LABEL_TO_ENUM[label]).toBe('EVENING');
  });

  it('MORNING → "6:00 AM" → MORNING', () => {
    const label = ENUM_TO_LABEL['MORNING'];
    expect(label).toBe('6:00 AM');
    expect(LABEL_TO_ENUM[label]).toBe('MORNING');
  });
});

// ─── calcStudyPeriod — Requirements A through D ───────────────────────────────

describe('calcStudyPeriod — Requirements A-D (5 PM start)', () => {
  /**
   * A. 1 hour + 5 PM → 5:00 PM – 6:00 PM
   */
  it('A: 1 hour + EVENING → 5:00 PM – 6:00 PM', () => {
    const period = calcStudyPeriod('EVENING', 1);
    expect(period.start).toBe('5:00 PM');
    expect(period.end).toBe('6:00 PM');
    expect(period.label).toBe('5:00 PM – 6:00 PM');
    expect(period.crossesMidnight).toBe(false);
  });

  /**
   * B. 2 hours + 5 PM → 5:00 PM – 7:00 PM
   */
  it('B: 2 hours + EVENING → 5:00 PM – 7:00 PM', () => {
    const period = calcStudyPeriod('EVENING', 2);
    expect(period.start).toBe('5:00 PM');
    expect(period.end).toBe('7:00 PM');
    expect(period.label).toBe('5:00 PM – 7:00 PM');
    expect(period.crossesMidnight).toBe(false);
  });

  /**
   * C. 3 hours + 5 PM → 5:00 PM – 8:00 PM
   */
  it('C: 3 hours + EVENING → 5:00 PM – 8:00 PM', () => {
    const period = calcStudyPeriod('EVENING', 3);
    expect(period.start).toBe('5:00 PM');
    expect(period.end).toBe('8:00 PM');
    expect(period.label).toBe('5:00 PM – 8:00 PM');
    expect(period.crossesMidnight).toBe(false);
  });

  /**
   * D. 4 hours + 5 PM → 5:00 PM – 9:00 PM
   */
  it('D: 4 hours + EVENING → 5:00 PM – 9:00 PM', () => {
    const period = calcStudyPeriod('EVENING', 4);
    expect(period.start).toBe('5:00 PM');
    expect(period.end).toBe('9:00 PM');
    expect(period.label).toBe('5:00 PM – 9:00 PM');
    expect(period.crossesMidnight).toBe(false);
  });
});

describe('calcStudyPeriod — other windows', () => {
  it('1 hour + MORNING → 6:00 AM – 7:00 AM', () => {
    const period = calcStudyPeriod('MORNING', 1);
    expect(period.start).toBe('6:00 AM');
    expect(period.end).toBe('7:00 AM');
    expect(period.crossesMidnight).toBe(false);
  });

  it('2 hours + AFTERNOON → 12:00 PM – 2:00 PM', () => {
    const period = calcStudyPeriod('AFTERNOON', 2);
    expect(period.start).toBe('12:00 PM');
    expect(period.end).toBe('2:00 PM');
    expect(period.crossesMidnight).toBe(false);
  });

  it('1 hour + LATE_NIGHT → 9:00 PM – 10:00 PM', () => {
    const period = calcStudyPeriod('LATE_NIGHT', 1);
    expect(period.start).toBe('9:00 PM');
    expect(period.end).toBe('10:00 PM');
    expect(period.crossesMidnight).toBe(false);
  });
});

describe('calcStudyPeriod — midnight crossing (edge cases)', () => {
  /**
   * Spec requirement: 10 PM + 3h crosses midnight.
   * The UI must warn rather than silently wrap.
   * crossesMidnight flag must be true.
   */
  it('3 hours + LATE_NIGHT (21:00) → crosses midnight, flag set', () => {
    const period = calcStudyPeriod('LATE_NIGHT', 3);
    expect(period.crossesMidnight).toBe(true);
    // end label contains "+1 day" marker so the user is not confused
    expect(period.end).toContain('+1 day');
  });

  it('2 hours + LATE_NIGHT (21:00) → 9:00 PM – 11:00 PM, does NOT cross midnight', () => {
    const period = calcStudyPeriod('LATE_NIGHT', 2);
    expect(period.crossesMidnight).toBe(false);
    expect(period.end).toBe('11:00 PM');
  });
});

describe('calcStudyPeriod — unknown / null enum falls back to EVENING', () => {
  it('unknown enum → EVENING start (5:00 PM)', () => {
    const period = calcStudyPeriod('UNKNOWN_VALUE', 1);
    expect(period.start).toBe('5:00 PM');
  });

  it('empty string → EVENING start (5:00 PM)', () => {
    const period = calcStudyPeriod('', 1);
    expect(period.start).toBe('5:00 PM');
  });
});

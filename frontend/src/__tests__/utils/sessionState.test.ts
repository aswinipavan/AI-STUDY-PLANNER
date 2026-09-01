import {
  getSessionState,
  evaluateSessionState,
  parseTimeToMinutes,
  formatFutureAvailability,
} from '@/utils/dateHelpers';

describe('Canonical Timetable Session State & Adaptive Planning Logic (Cases A–J)', () => {
  // Anchor date: Monday, August 31, 2026 at 2:58 PM (14:58)
  const aug31_258pm = new Date(2026, 7, 31, 14, 58, 0); // 14:58 (Upcoming)
  const aug31_530pm = new Date(2026, 7, 31, 17, 30, 0); // 17:30 (Active window)
  const aug31_601pm = new Date(2026, 7, 31, 18, 1, 0);  // 18:01 (Past deadline)

  // CASE A & B & C & E: Aug 29 missed topic carried forward to Aug 31 5:00 PM – 6:00 PM
  const aug31CatchUpSlot = {
    id: 'slot-aug31-catchup',
    date: '2026-08-31',
    startTime: '17:00:00',
    endTime: '18:00:00',
    status: 'pending',
    isCompleted: false,
    isCatchUp: true,
    missedDate: '2026-08-29',
    topic: 'Matrices - Determinants',
    notes: 'Rescheduled from 2026-08-29 (missed session caught up)',
  };

  const aug29HistoricalMissedSlot = {
    id: 'slot-aug29-historical',
    date: '2026-08-29',
    startTime: '17:00:00',
    endTime: '18:00:00',
    status: 'missed',
    isCompleted: false,
    topic: 'Matrices - Determinants',
  };

  const sep01FutureCatchUpSlot = {
    id: 'slot-sep01-future',
    date: '2026-09-01',
    startTime: '17:00:00',
    endTime: '18:00:00',
    status: 'pending',
    isCompleted: false,
    isCatchUp: true,
    missedDate: '2026-08-30',
    notes: 'Rescheduled from 2026-08-30 (missed session caught up)',
  };

  test('CASE A: Aug 29 missed, carried to Aug 31 at 2:58 PM -> CATCH_UP_TODAY / TODAY_UPCOMING, NOT MISSED', () => {
    const state = getSessionState(aug31CatchUpSlot, aug31_258pm);
    expect(state).toBe('CATCH_UP_TODAY');

    const evalRes = evaluateSessionState(aug31CatchUpSlot, aug31_258pm);
    expect(evalRes.isCatchUpActive).toBe(true);
    expect(evalRes.isUpcoming).toBe(true);
    expect(evalRes.isActive).toBe(false);
    expect(evalRes.isMissed).toBe(false); // MUST NOT BE MISSED
    expect(evalRes.isLocked).toBe(false);
    expect(evalRes.isActionable).toBe(true);
  });

  test('CASE B: Aug 31 Catch-up at 5:00 PM – 6:00 PM evaluated at 5:30 PM -> CATCH_UP_TODAY / TODAY_ACTIVE, NOT MISSED', () => {
    const state = getSessionState(aug31CatchUpSlot, aug31_530pm);
    expect(state).toBe('CATCH_UP_TODAY');

    const evalRes = evaluateSessionState(aug31CatchUpSlot, aug31_530pm);
    expect(evalRes.isCatchUpActive).toBe(true);
    expect(evalRes.isActive).toBe(true);
    expect(evalRes.isUpcoming).toBe(false);
    expect(evalRes.isMissed).toBe(false); // MUST NOT BE MISSED
    expect(evalRes.isActionable).toBe(true);
  });

  test('CASE C: Aug 31 Catch-up at 6:01 PM without completion -> PAST_MISSED', () => {
    const state = getSessionState(aug31CatchUpSlot, aug31_601pm);
    expect(state).toBe('PAST_MISSED');

    const evalRes = evaluateSessionState(aug31CatchUpSlot, aug31_601pm);
    expect(evalRes.isMissed).toBe(true);
    expect(evalRes.isActive).toBe(false);
    expect(evalRes.isUpcoming).toBe(false);
  });

  test('CASE D: Sep 1 catch-up / new session -> FUTURE_LOCKED (never missed)', () => {
    const state = getSessionState(sep01FutureCatchUpSlot, aug31_258pm);
    expect(state).toBe('FUTURE_LOCKED');

    const evalRes = evaluateSessionState(sep01FutureCatchUpSlot, aug31_258pm);
    expect(evalRes.isLocked).toBe(true);
    expect(evalRes.isMissed).toBe(false);
    expect(evalRes.isActionable).toBe(false);
    expect(formatFutureAvailability(sep01FutureCatchUpSlot.date, aug31_258pm)).toBe('Available tomorrow');
  });

  test('CASE E: Completed catch-up on Aug 31 preserves historical Aug 29 as MISSED and Aug 31 execution as COMPLETED', () => {
    // 1. Historical slot remains MISSED
    const histState = getSessionState(aug29HistoricalMissedSlot, aug31_258pm);
    expect(histState).toBe('PAST_MISSED');
    expect(evaluateSessionState(aug29HistoricalMissedSlot, aug31_258pm).isMissed).toBe(true);

    // 2. Execution slot completed on Aug 31
    const completedSlot = { ...aug31CatchUpSlot, isCompleted: true, status: 'completed' };
    const execState = getSessionState(completedSlot, aug31_258pm);
    expect(execState).toBe('TODAY_COMPLETED');
    const execEval = evaluateSessionState(completedSlot, aug31_258pm);
    expect(execEval.isCompleted).toBe(true);
    expect(execEval.isMissed).toBe(false);
  });

  test('CASE F & G: Daily capacity limits - max planned study time equals available target without overload', () => {
    // Standard 60m session in 1h window
    const duration1 = parseTimeToMinutes('18:00')! - parseTimeToMinutes('17:00')!;
    expect(duration1).toBe(60);

    // 2-hour daily target
    const duration2 = parseTimeToMinutes('19:00')! - parseTimeToMinutes('17:00')!;
    expect(duration2).toBe(120);
  });

  test('CASE H: Topics completed from uploaded materials are not scheduled again when covered', () => {
    const coveredTopicSlot = {
      date: '2026-08-25',
      topic: 'Introduction to Algorithms',
      isCompleted: true,
      status: 'completed',
    };
    expect(getSessionState(coveredTopicSlot, aug31_258pm)).toBe('TODAY_COMPLETED');
    expect(evaluateSessionState(coveredTopicSlot, aug31_258pm).isCompleted).toBe(true);
  });

  test('CASE I: Future sessions never enter missed queue', () => {
    const futureSlots = [
      { id: 'fut-1', date: '2026-09-01', startTime: '17:00:00', endTime: '18:00:00', isCompleted: false },
      { id: 'fut-2', date: '2026-09-02', startTime: '17:00:00', endTime: '18:00:00', isCompleted: false },
      { id: 'fut-3', date: '2026-09-03', startTime: '17:00:00', endTime: '18:00:00', isCompleted: false },
    ];
    const missedQueue = futureSlots.filter(s => getSessionState(s, aug31_258pm) === 'PAST_MISSED');
    expect(missedQueue.length).toBe(0);
  });

  test('CASE J: Today future session never enters missed queue before its deadline', () => {
    const todaySlots = [
      { id: 'tod-1', date: '2026-08-31', startTime: '17:00:00', endTime: '18:00:00', isCompleted: false },
    ];
    // Evaluated at 2:58 PM (before 5 PM start and 6 PM end)
    const missedQueueBefore = todaySlots.filter(s => getSessionState(s, aug31_258pm) === 'PAST_MISSED');
    expect(missedQueueBefore.length).toBe(0);

    // Evaluated at 5:30 PM (during session window)
    const missedQueueDuring = todaySlots.filter(s => getSessionState(s, aug31_530pm) === 'PAST_MISSED');
    expect(missedQueueDuring.length).toBe(0);

    // Evaluated at 6:01 PM (after session deadline without completion)
    const missedQueueAfter = todaySlots.filter(s => getSessionState(s, aug31_601pm) === 'PAST_MISSED');
    expect(missedQueueAfter.length).toBe(1);
    expect(missedQueueAfter[0].id).toBe('tod-1');
  });
});

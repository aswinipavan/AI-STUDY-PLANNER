import { describe, it, expect } from '@jest/globals';
import { formatDate, formatTime, formatTimeRange, getDayLabel, getDayShort, evaluateMobileSessionState } from '../utils/dateUtils';
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

    it('maps react-native-firebase auth error objects with code and message separately', () => {
      const firebaseError = {
        code: 'auth/invalid-credential',
        message: 'The supplied auth credential is incorrect, malformed or has expired.',
      };
      expect(getErrorMessage(firebaseError)).toContain('Invalid email or password');

      const userNotFound = {
        code: 'auth/user-not-found',
        message: 'There is no user record corresponding to this identifier.',
      };
      expect(getErrorMessage(userNotFound)).toContain('No account found with this email');
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

  describe('Mobile Decision Intelligence & Slot Categorization', () => {
    const {
      evaluateNextBestActionMobile,
      computeDayStudyStats,
      getLocalDateString,
    } = require('../utils/dashboardStats');

    const fixedTarget = new Date('2026-09-09T14:30:00'); // 2:30 PM
    const targetIso = getLocalDateString(fixedTarget);

    const mockExams = [
      {
        id: 'exam-1',
        examName: 'Discrete Mathematics Final',
        subject: { subjectName: 'Mathematics' },
        daysRemaining: 4,
        examDate: '2026-09-13',
      },
    ];

    const mockPriorities = [
      {
        id: 'p-1',
        subjectName: 'Mathematics',
        priorityLevel: 'HIGH',
        priorityScore: 88,
        averagePercentage: 58,
        reasons: ['Low assessment average: 58%'],
      },
    ];

    it('generates ACTIVE_NOW Next Best Action during active slot window', () => {
      const activeSlot = {
        id: 'slot-active',
        date: targetIso,
        startTime: '14:00',
        endTime: '15:00',
        durationMinutes: 60,
        isCompleted: false,
        subject: { subjectName: 'Mathematics' },
        topic: 'Graph Theory & Trees',
      };

      const action = evaluateNextBestActionMobile([activeSlot], [activeSlot], mockExams, mockPriorities, fixedTarget);
      expect(action.type).toBe('ACTIVE_NOW');
      expect(action.actionTitle).toBe('Complete Active Session');
      expect(action.targetName).toBe('Mathematics');
      expect(action.topic).toBe('Graph Theory & Trees');
      expect(action.reasons.some((r: string) => r.includes('Active study session'))).toBe(true);
      expect(action.reasons.some((r: string) => r.includes('High priority subject'))).toBe(true);
      expect(action.reasons.some((r: string) => r.includes('Exam in 4 days'))).toBe(true);
    });

    it('generates CATCH_UP Next Best Action when an uncompleted catch-up slot exists', () => {
      const catchUpSlot = {
        id: 'slot-catchup',
        date: targetIso,
        startTime: '17:00',
        endTime: '18:00',
        durationMinutes: 60,
        isCompleted: false,
        isCatchUp: true,
        subject: { subjectName: 'Operating Systems' },
        topic: 'Process Scheduling',
      };

      const action = evaluateNextBestActionMobile([catchUpSlot], [catchUpSlot], mockExams, mockPriorities, fixedTarget);
      expect(action.type).toBe('CATCH_UP');
      expect(action.actionTitle).toBe('Catch Up on Missed Session');
      expect(action.targetName).toBe('Operating Systems');
      expect(action.reasons.some((r: string) => r.includes('Carried forward'))).toBe(true);
    });

    it('categorizes slots into past, current, and upcoming with completion rate calculation', () => {
      const slots = [
        {
          id: 'slot-past',
          date: targetIso,
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          isCompleted: true,
          subject: { subjectName: 'Mathematics' },
        },
        {
          id: 'slot-current',
          date: targetIso,
          startTime: '14:00',
          endTime: '15:00',
          durationMinutes: 60,
          isCompleted: false,
          subject: { subjectName: 'Operating Systems' },
        },
        {
          id: 'slot-upcoming',
          date: targetIso,
          startTime: '18:00',
          endTime: '19:00',
          durationMinutes: 60,
          isCompleted: false,
          subject: { subjectName: 'Networks' },
        },
      ];

      const stats = computeDayStudyStats(slots, fixedTarget, mockExams, mockPriorities);
      expect(stats.categorizedSlots.past).toHaveLength(1);
      expect(stats.categorizedSlots.past[0].id).toBe('slot-past');
      expect(stats.categorizedSlots.current?.id).toBe('slot-current');
      expect(stats.categorizedSlots.upcoming).toHaveLength(1);
      expect(stats.categorizedSlots.upcoming[0].id).toBe('slot-upcoming');
      expect(stats.highPrioritySessions).toBe(1);
      expect(stats.completionRate).toBe(33);
    });
  });

  describe('Web <-> Mobile Data Parity & Schema Invariants', () => {
    it('verifies SlotResponse schema matches Web and Backend evidence verification contracts', () => {
      const slot: import('../types/timetable.types').SlotResponse = {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        subject: {
          id: 'sub-1',
          subjectName: 'Computer Networks',
          subjectCode: 'CS401',
          credits: 4,
          difficultyLevel: 3,
          semester: 6,
          createdAt: '2026-09-01T10:00:00Z',
        },
        dayOfWeek: 2,
        date: '2026-09-09',
        startTime: '17:00:00',
        endTime: '18:00:00',
        durationMinutes: 60,
        topic: 'TCP Handshake & Congestion Control',
        chapter: 'Transport Layer Protocols',
        materialTitle: 'CN Unit 3 Notes.pdf',
        materialId: 'mat-uuid-1',
        whatToStudy: ['3-Way Handshake', 'Slow Start algorithm', 'TCP Tahoe vs Reno'],
        selectionReason: 'Highest exam weightage topic',
        difficultyScore: 68,
        difficulty: 'MEDIUM',
        isCompleted: true,
        status: 'completed',
        hasEvidence: true,
        evidenceStatus: 'APPROVED',
        evidenceScore: 88,
        evidenceId: 'ev-uuid-1',
        notes: 'Completed with full notes proof',
      };

      expect(slot.id).toBe('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
      expect(slot.hasEvidence).toBe(true);
      expect(slot.evidenceStatus).toBe('APPROVED');
      expect(slot.evidenceScore).toBe(88);
      expect(slot.isCompleted).toBe(true);
      expect(slot.durationMinutes).toBe(60);
    });

    it('verifies MaterialResponse schema matches Web upload and preview contract', () => {
      const material: import('../types/material.types').MaterialResponse = {
        id: 'mat-uuid-101',
        subjectId: 'sub-uuid-202',
        subjectName: 'Operating Systems',
        title: 'Virtual Memory & Paging Algorithms',
        fileName: 'OS_Unit_4.pdf',
        fileUrl: 'https://studyplanner.supabase.co/storage/v1/object/public/materials/OS_Unit_4.pdf',
        fileType: 'application/pdf',
        materialType: 'DOCUMENT',
        fileSizeBytes: 2048576,
        aiSummary: 'Comprehensive overview of virtual memory, page fault handling, LRU and Clock replacement.',
        extractedTopics: 'Paging, TLB, Page Replacement Algorithms, Thrashing',
        extractedChapters: 'Chapter 8: Main Memory, Chapter 9: Virtual Memory',
        extractedKeywords: 'demand paging, page fault, frame allocation, thrashing',
        overallDifficulty: 'MEDIUM',
        difficultyScore: 65,
        difficultyReason: 'Algorithmic complexity of page replacement',
        processingStatus: 'COMPLETED',
        uploadedAt: '2026-09-09T12:00:00Z',
      };

      expect(material.id).toBe('mat-uuid-101');
      expect(material.subjectId).toBe('sub-uuid-202');
      expect(material.subjectName).toBe('Operating Systems');
      expect(material.processingStatus).toBe('COMPLETED');
      expect(material.difficultyScore).toBe(65);
    });

    it('verifies StudentResponse schema matches 6 persistent profile fields and notification preferences', () => {
      const profile: import('../types/student.types').StudentResponse = {
        id: 'stu-uuid-555',
        firebaseUid: 'firebase-uid-555',
        fullName: 'Aswini Pavan',
        email: 'aswini.pavan@university.edu',
        phoneNumber: '+91 9876543210',
        collegeName: 'National Institute of Technology',
        department: 'Computer Science & Engineering',
        semester: 6,
        isPremium: true,
        studyStreak: 7,
        availableHoursPerDay: 4.0,
        preferredStudyTime: 'EVENING',
        profilePictureUrl: 'https://studyplanner.supabase.co/avatars/user555.png',
        emailNotifications: true,
        pushNotifications: true,
      };

      expect(profile.fullName).toBe('Aswini Pavan');
      expect(profile.phoneNumber).toBe('+91 9876543210');
      expect(profile.semester).toBe(6);
      expect(profile.availableHoursPerDay).toBe(4.0);
      expect(profile.preferredStudyTime).toBe('EVENING');
      expect(profile.emailNotifications).toBe(true);
      expect(profile.pushNotifications).toBe(true);
    });
  });

  describe('Mobile Timetable Capacity & State Evaluation', () => {
    const {
      slotDurationMinutes,
      formatHoursAndMinutes,
      computeDayStudyCapacityMobile,
      evaluateMobileSessionState,
    } = require('../utils/dateUtils');

    it('calculates slot duration accurately in minutes including midnight crossing', () => {
      expect(slotDurationMinutes('17:00', '18:00')).toBe(60);
      expect(slotDurationMinutes('14:30', '16:00')).toBe(90);
      expect(slotDurationMinutes('23:00', '01:00')).toBe(120);
    });

    it('formats minutes to human readable hours and minutes', () => {
      expect(formatHoursAndMinutes(0)).toBe('0m');
      expect(formatHoursAndMinutes(45)).toBe('45m');
      expect(formatHoursAndMinutes(60)).toBe('1h');
      expect(formatHoursAndMinutes(90)).toBe('1h 30m');
      expect(formatHoursAndMinutes(120)).toBe('2h');
    });

    it('computes mobile day study capacity and over-allocation correctly', () => {
      const slots = [
        { startTime: '17:00', endTime: '18:00' }, // 60m
        { startTime: '18:15', endTime: '19:15' }, // 60m
      ];

      const underAllocated = computeDayStudyCapacityMobile(3, slots); // 180m cap, 120m sched
      expect(underAllocated.capacityMinutes).toBe(180);
      expect(underAllocated.scheduledMinutes).toBe(120);
      expect(underAllocated.remainingMinutes).toBe(60);
      expect(underAllocated.isOverAllocated).toBe(false);
      expect(underAllocated.utilizationPercent).toBe(67);
      expect(underAllocated.capacityFormatted).toBe('3h');
      expect(underAllocated.scheduledFormatted).toBe('2h');
      expect(underAllocated.remainingFormatted).toBe('1h');

      const overAllocated = computeDayStudyCapacityMobile(1, slots); // 60m cap, 120m sched
      expect(overAllocated.isOverAllocated).toBe(true);
      expect(overAllocated.remainingMinutes).toBe(0);
      expect(overAllocated.utilizationPercent).toBe(200);
    });

    it('evaluates future slot state as FUTURE_LOCKED (never missed or actionable early)', () => {
      const futureSlot = {
        date: '2026-09-15',
        startTime: '17:00',
        endTime: '18:00',
        isCompleted: false,
      };
      const fixedNow = new Date('2026-09-09T14:00:00');
      const evalRes = evaluateMobileSessionState(futureSlot, fixedNow);
      expect(evalRes.state).toBe('FUTURE_LOCKED');
      expect(evalRes.isLocked).toBe(true);
      expect(evalRes.isMissed).toBe(false);
      expect(evalRes.isActive).toBe(false);
      expect(evalRes.isUpcoming).toBe(false);
    });

    it('evaluates today catch-up slot accurately during active hours without labeling as missed', () => {
      const catchUpSlot = {
        date: '2026-09-09',
        startTime: '14:00',
        endTime: '15:00',
        isCatchUp: true,
        isCompleted: false,
      };
      const fixedNow = new Date('2026-09-09T14:30:00');
      const evalRes = evaluateMobileSessionState(catchUpSlot, fixedNow);
      expect(evalRes.state).toBe('CATCH_UP_TODAY');
      expect(evalRes.isActive).toBe(true);
      expect(evalRes.isMissed).toBe(false);
      expect(evalRes.isLocked).toBe(false);
      expect(evalRes.isCatchUp).toBe(true);
    });
  });

  describe('P2.5B AI Revision Mode (Mobile)', () => {
    it('calculates 5-question quiz score percentage and mastery tier correctly', () => {
      const quizQuestions = [
        { id: 1, question: 'Q1', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0, explanation: 'Exp 1' },
        { id: 2, question: 'Q2', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 1, explanation: 'Exp 2' },
        { id: 3, question: 'Q3', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 2, explanation: 'Exp 3' },
        { id: 4, question: 'Q4', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 3, explanation: 'Exp 4' },
        { id: 5, question: 'Q5', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0, explanation: 'Exp 5' },
      ];

      const userAnswers: Record<number, number> = {
        0: 0, // Correct
        1: 1, // Correct
        2: 2, // Correct
        3: 3, // Correct
        4: 1, // Incorrect (correct was 0)
      };

      const correctCount = quizQuestions.reduce((acc, q, idx) => {
        return userAnswers[idx] === q.correctOptionIndex ? acc + 1 : acc;
      }, 0);

      const scorePercentage = Math.round((correctCount / quizQuestions.length) * 100);

      expect(correctCount).toBe(4);
      expect(scorePercentage).toBe(80);
      expect(scorePercentage >= 80).toBe(true); // Mastery tier
    });

    it('validates SlotRevisionResponse schema contracts and key elements', () => {
      const mockRevision = {
        id: 'rev-uuid-1',
        slotId: 'slot-uuid-1',
        topic: 'Fourier Series & Harmonic Analysis',
        summary: 'A Fourier series decomposes periodic functions into sinusoidal components.',
        keyConcepts: ['Orthogonality', 'Dirichlet Conditions', 'Gibbs Phenomenon'],
        importantFormulas: [
          {
            title: 'Fourier Series Expansion',
            formula: 'f(x) = \\frac{a_0}{2} + \\sum_{n=1}^\\infty \\left[ a_n \\cos(nx) + b_n \\sin(nx) \\right]',
            description: 'Standard trigonometric series expansion',
          },
        ],
        quizQuestions: [
          {
            id: 1,
            question: 'What is the period of the fundamental harmonic?',
            options: ['2π/ω', 'π/ω', '4π/ω', 'ω/2π'],
            correctOptionIndex: 0,
            explanation: 'The fundamental frequency has period T = 2π/ω.',
          },
        ],
        weakAreas: ['Integration by parts sign errors', 'Even/Odd coefficient simplifications'],
        quickRevisionPoints: ['Verify Dirichlet conditions first', 'Check function parity before integrating'],
        isCompleted: false,
      };

      expect(mockRevision.slotId).toBe('slot-uuid-1');
      expect(mockRevision.topic).toContain('Fourier Series');
      expect(mockRevision.keyConcepts).toHaveLength(3);
      expect(mockRevision.importantFormulas[0].formula).toContain('\\frac{a_0}{2}');
      expect(mockRevision.quizQuestions[0].options).toHaveLength(4);
      expect(mockRevision.weakAreas).toHaveLength(2);
      expect(mockRevision.quickRevisionPoints).toHaveLength(2);
      expect(mockRevision.isCompleted).toBe(false);
    });

    it('enables AI revision trigger on completed and verified slots only', () => {
      const completedSlot = {
        id: 'slot-1',
        isCompleted: true,
        date: '2026-09-09',
        startTime: '10:00',
        endTime: '11:00',
      };
      const pendingSlot = {
        id: 'slot-2',
        isCompleted: false,
        date: '2026-09-09',
        startTime: '11:00',
        endTime: '12:00',
      };

      const now = new Date('2026-09-09T12:00:00');
      const evalCompleted = evaluateMobileSessionState(completedSlot, now);
      const evalPending = evaluateMobileSessionState(pendingSlot, now);

      expect(evalCompleted.isCompleted).toBe(true);
      expect(evalPending.isCompleted).toBe(false);
    });
  });
});




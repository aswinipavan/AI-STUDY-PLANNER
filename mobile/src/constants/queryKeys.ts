/**
 * Centralized React Query key constants.
 * Mirrors the QK convention from the web frontend for consistency.
 */
export const QK = {
  // Auth / Profile
  PROFILE: ['profile'] as const,

  // Subjects
  SUBJECTS: ['subjects'] as const,
  SUBJECT: (id: string) => ['subject', id] as const,

  // Timetable
  TIMETABLE_ACTIVE: ['timetable', 'active'] as const,
  TIMETABLE_ALL: ['timetable', 'all'] as const,

  // Exams
  EXAMS_ALL: ['exams', 'all'] as const,
  EXAMS_UPCOMING: ['exams', 'upcoming'] as const,

  // Marks
  MARKS_ALL: ['marks', 'all'] as const,
  MARKS_AVERAGES: ['marks', 'averages'] as const,

  // Performance
  PERFORMANCE_REPORT: ['performance', 'report'] as const,

  // AI
  MOTIVATION: ['ai', 'motivation'] as const,
  CHAT_HISTORY: (sessionId: string) => ['chat', 'history', sessionId] as const,
} as const;

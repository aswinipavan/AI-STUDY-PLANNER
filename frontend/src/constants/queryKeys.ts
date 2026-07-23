// central key registry
export const QK = {
  subjects: ['subjects'] as const,
  subject: (id: string) => ['subjects', id] as const,
  timetable: ['timetable', 'active'] as const,
  exams: ['exams', 'upcoming'] as const,
  materials: ['materials'] as const,
  chatSessions: ['chat', 'sessions'] as const,
  chatHistory: (id: string) => ['chat', 'history', id] as const,
  performance: ['performance', 'report'] as const,
  priority: ['performance', 'priority'] as const,
  subscription: ['subscription', 'status'] as const,
} as const;

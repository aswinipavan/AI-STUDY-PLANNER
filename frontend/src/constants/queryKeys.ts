// central key registry
export const QK = {
  subjects: ['subjects'] as const,
  subject: (id: string) => ['subjects', id] as const,
  timetable: ['timetable', 'active'] as const,
  timetableInsights: ['timetable', 'insights'] as const,
  exams: ['exams', 'upcoming'] as const,
  materials: ['materials'] as const,
  chatSessions: ['chat', 'sessions'] as const,
  chatHistory: (id: string) => ['chat', 'history', id] as const,
  performance: ['performance', 'report'] as const,
  priority: ['performance', 'priority'] as const,
  readiness: ['performance', 'readiness'] as const,
  aiAnalysis: ['performance', 'aiAnalysis'] as const,
  subscription: ['subscription', 'status'] as const,
  studyRooms: ['studyRooms', 'active'] as const,
  studyRoom: (code: string) => ['studyRooms', 'room', code] as const,
  studyRoomMessages: (code: string) => ['studyRooms', 'messages', code] as const,
  notifications: ['notifications'] as const,
} as const;



export interface StudentProfile {
  id: string;
  firebaseUid: string;
  // Backend returns 'fullName'. Keep 'name' as optional alias for compatibility.
  fullName?: string;
  name?: string; // alias — populated from fullName on fetch
  email: string;
  photoUrl?: string; // alias for profilePictureUrl
  profilePictureUrl?: string;
  collegeName?: string;
  semester?: number;
  department?: string;
  phoneNumber?: string;
  grade?: string; // kept for backward compat (maps to department in some contexts)
  isPremium: boolean;
  studyStreak?: number;
  availableHoursPerDay?: number;
  createdAt: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

export interface Subject {
  id: string; 
  name: string; 
  color?: string; 
  icon?: string;
  targetHours?: number; 
  studentId: string;
  examDate?: string; // Next exam date for this subject
  daysUntilExam?: number; // Calculated remaining days
}

export interface Exam {
  id: string; 
  subjectId: string; 
  subject?: Subject; 
  examName: string;
  examDate: string;
  examType?: string;
  durationHours?: number;
  syllabusCovered?: string;
  difficulty: 'easy' | 'medium' | 'hard'; 
  notes?: string;
  daysRemaining?: number;
  isCompleted?: boolean;
}

export interface TimetableSlot {
  id: string; 
  subjectId: string; 
  subject?: Subject;
  startTime: string; 
  endTime: string; 
  date: string;
  status: 'pending' | 'completed' | 'skipped'; 
  timetableId: string;
}

export interface Timetable {
  id: string; 
  studentId: string; 
  slots: TimetableSlot[];
  generatedAt: string; 
  isActive: boolean;
}

export interface StudyMaterial {
  id: string; 
  title: string; 
  fileUrl: string;
  fileType: 'pdf' | 'image' | 'video' | 'doc'; 
  subjectId: string; 
  uploadedAt: string;
  aiSummary?: string;
  aiCategorizedSubject?: string;
  fileName?: string;
  fileSizeBytes?: number;
  materialType?: string;
}

export interface ChatSession {
  id: string; 
  title: string; 
  createdAt: string; 
  lastMessage?: string;
}

export interface ChatMessage {
  id: string; 
  role: 'user' | 'assistant';
  content: string; 
  sessionId: string; 
  timestamp: string;
}

export interface Mark {
  id: string; 
  subjectId: string; 
  score: number;
  maxScore: number; 
  testName: string; 
  date: string;
}

export interface SubjectPerformance {
  subjectId: string; 
  subjectName: string; 
  averageScore: number;
  marksHistory: Mark[]; 
  priority: number;
}

export interface PerformanceReport {
  overallAverage: number;
  subjectBreakdown: SubjectPerformance[];
  trend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
}

export interface SubscriptionStatus {
  isPremium: boolean; 
  plan?: 'monthly' | 'yearly';
  expiresAt?: string; 
  features: string[];
}

// API DTOs
export type CreateSubjectDTO = Pick<Subject, 'name' | 'color' | 'icon' | 'targetHours'>;
export type CreateExamDTO = Pick<Exam, 'subjectId' | 'examDate' | 'difficulty' | 'notes'>;
export type GenerateTimetableDTO = {
  subjectIds: string[]; 
  availableHoursPerDay: number;
  style: 'intense' | 'balanced' | 'relaxed'; 
  startDate: string; 
  durationDays: number;
  useDeadlines?: boolean; // Use exam deadlines for prioritization
  targetDeadlineDate?: string; // Optional: if all subjects share a deadline
};

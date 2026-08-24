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
  preferredStudyTime?: string; // backend StudyTimeWindow enum: MORNING | AFTERNOON | EVENING | LATE_NIGHT
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
  subjectId?: string; 
  subject?: Subject;
  startTime: string; 
  endTime: string; 
  date?: string;
  dayOfWeek?: number;
  topic?: string;
  status: 'pending' | 'completed' | 'skipped'; 
  timetableId?: string;
}

export interface Timetable {
  id: string; 
  studentId: string; 
  slots: TimetableSlot[];
  generatedAt: string; 
  isActive: boolean;
}

export interface MaterialTopic {
  name: string;
  chapter?: string;
  keywords?: string[];
  relevanceScore?: number;
  estimatedMinutes?: number;
}

export interface MaterialChapter {
  title: string;
  chapterNumber?: string;
  subtopics?: string[];
  contentSnippet?: string;
  confidence?: number;
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
  processingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  extractedTopics?: string | MaterialTopic[];
  extractedChapters?: string | MaterialChapter[];
  extractedKeywords?: string | string[];
  overallDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  difficultyScore?: number;
  difficultyReason?: string;
  errorMessage?: string;
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

export interface SubjectPriority {
  id: string;
  subjectName: string;
  subjectCode?: string;
  credits?: number;
  difficultyLevel?: number;
  averagePercentage?: number;
  nextExamDate?: string;
  daysUntilExam?: number;
  priorityScore: number;
  priorityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  recommendedStudyTime: string;
}

export interface AcademicReadiness {
  overallReadiness: number;
  subjectPerformanceScore: number;
  examPreparationScore: number;
  studyConsistencyScore: number;
  materialCoverageScore: number;
  aiExplanation: string;
  primaryFocusSubject: string;
}

export interface AiPerformanceAnalysis {
  currentPerformance: number;
  performanceGrade: string;
  weakAreas: string[];
  strongAreas: string[];
  performanceTrend: string;
  examUrgency: string;
  recommendedTopics: string[];
  recommendedStudyDuration: string;
  aiDetailedSummary: string;
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

export interface StudyRoomParticipant {
  id: string;
  studentId: string;
  studentName: string;
  avatarUrl?: string;
  isOwner: boolean;
  joinedAt: string;
}

export interface StudyRoomMessage {
  id: string;
  senderId?: string;
  senderName: string;
  message: string;
  isAi: boolean;
  createdAt: string;
}

export interface StudyRoom {
  id: string;
  roomCode: string;
  ownerId: string;
  ownerName: string;
  subjectId?: string;
  subjectName: string;
  topic?: string;
  durationMinutes: number;
  maxParticipants: number;
  currentParticipantsCount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
  secondsRemaining: number;
  participants: StudyRoomParticipant[];
  recentMessages?: StudyRoomMessage[];
}

export interface CreateStudyRoomDTO {
  subjectId?: string;
  subjectName?: string;
  topic?: string;
  durationMinutes?: number;
  maxParticipants?: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionUrl: string;
  createdAt: string;
  isRead: boolean;
}


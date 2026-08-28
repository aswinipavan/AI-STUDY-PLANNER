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
  durationMinutes?: number;
  date?: string;
  dayOfWeek?: number;
  topic?: string;
  chapter?: string;
  materialTitle?: string;
  materialId?: string;
  whatToStudy?: string[];
  selectionReason?: string;
  examDeadline?: string;
  examName?: string;
  daysUntilExam?: number;
  difficulty?: string;
  difficultyScore?: number;
  isCompleted?: boolean;
  status: 'pending' | 'completed' | 'missed' | 'skipped'; 
  isCatchUp?: boolean;
  missedDate?: string;
  notes?: string;
  timetableId?: string;
}

export interface Timetable {
  id: string; 
  studentId: string; 
  slots: TimetableSlot[];
  generatedAt: string; 
  isActive: boolean;
  weekStartDate?: string;
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
  subjectId?: string;
  subjectName?: string;
  subject?: Subject | { id: string; subjectName?: string; name?: string; studentId?: string };
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


/* ── Adaptive scheduling ──────────────────────────────────────────────────────
   Mirrors the backend's SubjectReadinessResponse / AdaptationResponse. Every
   number here is measured from the student's own material, marks, exams and
   session history — nothing is a fixed ladder. */

export interface SubjectReadiness {
  subjectId: string;
  subjectName: string;
  averagePercentage?: number;
  difficultyLevel?: number;
  totalTopics?: number;
  coveredTopics?: number;
  coveragePercent?: number;
  completedSessions?: number;
  missedSessions?: number;
  upcomingSessions?: number;
  consistencyPercent?: number;
  materialDifficulty?: number;
  nextExamDate?: string;
  daysUntilExam?: number;
  readiness?: number;
  examPreparedness?: number;
  priorityWeight?: number;
  sessionSharePercent?: number;
  recommendedStudyTime?: string;
  allTopicsCovered?: boolean;
  /** COVERING_NEW_MATERIAL | REVISION | EXAM_PREP … — drives the stage badge. */
  stage?: string;
  /** Human-readable "why this subject ranks here" lines. */
  reasons?: string[];
}

export interface AdaptationResult {
  adapted: boolean;
  trigger?: string;
  summary?: string;
  /** The "why the plan changed" list, rendered verbatim to the student. */
  changes?: string[];
  slotsRemoved?: number;
  slotsCreated?: number;
  slotsPreserved?: number;
  missedSessionsRescheduled?: number;
  horizonStart?: string;
  horizonEnd?: string;
  subjects?: SubjectReadiness[];
  timetable?: Timetable;
}

/**
 * What caused an adaptation — sent to the backend as a hint for the summary.
 *
 * These strings must match `AdaptiveScheduleService.TRIGGER_*` exactly. The
 * backend `switch` in `buildSummary` falls through to a generic "Plan adapted to
 * your current progress" on anything it does not recognise, so a typo here does
 * not fail loudly — it just quietly replaces the specific reason the plan changed
 * with a vague one. Two members were previously misspelled (`SESSION_MISSED` for
 * `MISSED_SESSIONS`, `PERFORMANCE_CHANGED` for `MARKS_CHANGED`), which is why
 * this is a runtime array with the union derived from it: a `type` alone cannot
 * be enumerated, so nothing could check it against the backend. See
 * `__tests__/types/adaptationTrigger.contract.test.ts`.
 */
export const ADAPTATION_TRIGGERS = [
  'MANUAL',
  'SESSION_COMPLETED',
  'MISSED_SESSIONS',
  'NEW_MATERIAL',
  'EXAM_CHANGED',
  'MARKS_CHANGED',
] as const;

export type AdaptationTrigger = (typeof ADAPTATION_TRIGGERS)[number];

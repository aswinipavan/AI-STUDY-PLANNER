import type {SubjectResponse} from './student.types';

/**
 * Mirrors backend SlotResponse DTO
 * dayOfWeek: 0=Monday … 6=Sunday  (matches backend TimetableSlot entity)
 */
export interface SlotResponse {
  id: string; // UUID
  subject: SubjectResponse;
  dayOfWeek: number; // 0-6
  date?: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm:ss"
  endTime: string; // "HH:mm:ss"
  durationMinutes?: number;
  topic: string | null;
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
  isCompleted: boolean;
  status?: 'pending' | 'completed' | 'missed' | 'skipped';
  isCatchUp?: boolean;
  missedDate?: string;
  notes: string | null;
}

/**
 * Mirrors backend TimetableResponse DTO
 */
export interface TimetableResponse {
  id: string; // UUID
  title: string | null;
  weekStartDate: string; // "YYYY-MM-DD"
  isAiGenerated: boolean;
  isActive: boolean;
  slots: SlotResponse[];
  createdAt: string; // ISO datetime
}

/**
 * Mirrors backend GenerateTimetableRequest DTO
 * POST /api/timetable/generate
 */
export interface GenerateTimetableRequest {
  subjectIds: string[];
  availableHoursPerDay: number;
  style: 'intense' | 'balanced' | 'relaxed';
  startDate: string; // "YYYY-MM-DD"
  durationDays: number;
  useDeadlines?: boolean;
  targetDeadlineDate?: string;
}

/**
 * Mirrors backend TimetableRequest DTO
 * POST /api/timetable/custom
 */
export interface TimetableRequest {
  title?: string;
  weekStartDate?: string; // "YYYY-MM-DD"
}

/**
 * Mirrors backend SlotRequest DTO
 * PUT /api/timetable/slots/{slotId}
 */
export interface SlotRequest {
  subjectId: string;
  dayOfWeek: number;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  topic?: string;
  notes?: string;
}

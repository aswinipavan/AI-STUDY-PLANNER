import type {SubjectResponse} from './student.types';

/**
 * Mirrors backend SlotResponse DTO
 * dayOfWeek: 0=Monday … 6=Sunday  (matches backend TimetableSlot entity)
 */
export interface SlotResponse {
  id: string; // UUID
  subject: SubjectResponse;
  dayOfWeek: number; // 0-6
  startTime: string; // "HH:mm:ss"
  endTime: string; // "HH:mm:ss"
  topic: string | null;
  isCompleted: boolean;
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
 * Mirrors backend TimetableRequest DTO
 * POST /api/timetable/generate or /api/timetable/custom
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

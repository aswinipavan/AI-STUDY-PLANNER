import type {SubjectResponse} from './student.types';

/**
 * Mirrors backend ExamResponse DTO
 * GET /api/exams/ and /api/exams/upcoming
 */
export interface ExamResponse {
  id: string; // UUID
  subject: SubjectResponse;
  examName: string | null;
  examDate: string; // "YYYY-MM-DD"
  examType: string | null;
  syllabusCovered: string | null;
  daysRemaining: number; // computed on backend
  isCompleted: boolean;
}

/**
 * Mirrors backend ExamRequest DTO
 * POST /api/exams/ and PUT /api/exams/{examId}
 */
export interface ExamRequest {
  subjectId: string;
  examName?: string;
  examDate: string; // "YYYY-MM-DD"
  examType?: string; // "QUIZ" | "MIDTERM" | "SEMESTER" | "PRACTICAL" | "ASSIGNMENT"
  durationHours?: number;
  syllabusCovered?: string;
}

import type {SubjectResponse} from './student.types';

export interface PerformanceResponse {
  overallPercentage?: number;
  strongSubjects?: SubjectResponse[];
  weakSubjects?: SubjectResponse[];
  subjectWiseMarks?: Record<string, number>;
  studyStreak?: number;
  recommendations?: string[];
}

export interface PerformanceSnapshot {
  id: string;
  overallScore: number;
  dateRecorded: string;
  notes?: string;
}

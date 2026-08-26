import { apiClient } from '@/lib/apiClient';
import { Subject } from '@/types/api.types';

export const subjectsApi = {
  getAll: async (): Promise<Subject[]> => {
    const response = await apiClient.get('/api/students/me/subjects');
    const data = response.data.data ?? response.data;
    return Array.isArray(data) ? data.map(mapSubjectFromBackend) : [];
  },

  create: async (data: Partial<Subject>): Promise<Subject> => {
    const response = await apiClient.post('/api/students/me/subjects', mapSubjectToBackend(data));
    const result = response.data.data ?? response.data;
    return mapSubjectFromBackend(result);
  },

  update: async (id: string, data: Partial<Subject>): Promise<Subject> => {
    const response = await apiClient.put(`/api/students/me/subjects/${id}`, mapSubjectToBackend(data));
    const result = response.data.data ?? response.data;
    return mapSubjectFromBackend(result);
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/students/me/subjects/${id}`);
  },
};

/**
 * The backend's `SubjectResponse`. Note `subjectName` — the frontend `Subject`
 * type calls it `name`, so every subject crossing the API boundary (including the
 * ones *nested* inside timetable slots) has to go through the mapper below.
 * `studentId` is absent on nested copies, hence optional.
 */
export interface BackendSubjectResponse {
  id: string;
  subjectName?: string;
  name?: string;
  color?: string;
  icon?: string;
  targetHours?: number;
  studentId?: string;
  nextExamDate?: string;
  daysUntilExam?: number;
}

interface BackendSubjectRequest {
  subjectName?: string;
  subjectCode?: string;
  credits: number;
  difficultyLevel: number;
  semester: number | null;
}

// Map backend SubjectResponse to frontend Subject type
export function mapSubjectFromBackend(backend: BackendSubjectResponse): Subject {
  return {
    id: backend.id,
    name: backend.subjectName || backend.name || '',
    color: backend.color,
    icon: backend.icon,
    targetHours: backend.targetHours,
    studentId: backend.studentId ?? '',
    examDate: backend.nextExamDate, // Map backend's nextExamDate to frontend's examDate
    daysUntilExam: backend.daysUntilExam,
  };
}

// Map frontend Subject to backend SubjectRequest
function mapSubjectToBackend(frontend: Partial<Subject>): BackendSubjectRequest {
  return {
    subjectName: frontend.name,
    subjectCode: frontend.color, // reusing color field for code if needed
    credits: 3,
    difficultyLevel: 3,
    semester: null,
  };
}

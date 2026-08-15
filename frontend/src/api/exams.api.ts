import { apiClient } from '@/lib/apiClient';
import { Exam } from '@/types/api.types';

export const examsApi = {
  create: async (data: Partial<Exam>): Promise<Exam> => {
    const response = await apiClient.post('/api/exams/', {
      subjectId: data.subjectId,
      examName: data.examName,
      examDate: data.examDate,
      examType: data.examType,
      durationHours: data.durationHours,
      syllabusCovered: data.syllabusCovered,
      difficulty: data.difficulty,
      notes: data.notes,
    });
    return response.data.data ?? response.data;
  },

  getUpcoming: async (): Promise<Exam[]> => {
    const response = await apiClient.get('/api/exams/upcoming');
    const data = response.data.data ?? response.data;
    return Array.isArray(data) ? data : [];
  },

  update: async (id: string, data: Partial<Exam>): Promise<Exam> => {
    const response = await apiClient.put(`/api/exams/${id}`, {
      subjectId: data.subjectId,
      examName: data.examName,
      examDate: data.examDate,
      examType: data.examType,
      durationHours: data.durationHours,
      syllabusCovered: data.syllabusCovered,
      difficulty: data.difficulty,
      notes: data.notes,
    });
    return response.data.data ?? response.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/exams/${id}`);
  },
};

import { apiClient } from '@/lib/apiClient';
import { Exam } from '@/types/api.types';

export const examsApi = {
  create: async (data: Partial<Exam>): Promise<Exam> => {
    const response = await apiClient.post('/api/exams/', data);
    return response.data;
  },

  getUpcoming: async (): Promise<Exam[]> => {
    const response = await apiClient.get('/api/exams/upcoming');
    return response.data;
  },

  update: async (id: string, data: Partial<Exam>): Promise<Exam> => {
    const response = await apiClient.put(`/api/exams/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/exams/${id}`);
  },
};

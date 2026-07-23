import { apiClient } from '@/lib/apiClient';
import { Subject } from '@/types/api.types';

export const subjectsApi = {
  getAll: async (): Promise<Subject[]> => {
    const response = await apiClient.get('/api/students/me/subjects');
    return response.data;
  },

  create: async (data: Partial<Subject>): Promise<Subject> => {
    const response = await apiClient.post('/api/students/me/subjects', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Subject>): Promise<Subject> => {
    const response = await apiClient.put(`/api/students/me/subjects/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/students/me/subjects/${id}`);
  },
};

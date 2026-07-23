import { apiClient } from '@/lib/apiClient';
import { Mark, PerformanceReport, SubjectPerformance } from '@/types/api.types';

export const performanceApi = {
  addMark: async (data: Partial<Mark>): Promise<Mark> => {
    const response = await apiClient.post('/api/marks/', data);
    return response.data;
  },

  getReport: async (): Promise<PerformanceReport> => {
    const response = await apiClient.get('/api/performance/report');
    return response.data;
  },

  getPriority: async (): Promise<SubjectPerformance[]> => {
    const response = await apiClient.get('/api/performance/priority');
    return response.data;
  },
};

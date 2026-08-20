import { apiClient } from '@/lib/apiClient';
import { Mark, PerformanceReport, SubjectPriority, AcademicReadiness, AiPerformanceAnalysis } from '@/types/api.types';

export const performanceApi = {
  addMark: async (data: Partial<Mark>): Promise<Mark> => {
    const response = await apiClient.post('/api/marks/', data);
    return response.data.data ?? response.data;
  },

  getReport: async (): Promise<PerformanceReport> => {
    const response = await apiClient.get('/api/performance/report');
    return response.data.data ?? response.data;
  },

  getPriority: async (): Promise<SubjectPriority[]> => {
    const response = await apiClient.get('/api/performance/priority');
    return response.data.data ?? response.data;
  },

  getReadiness: async (): Promise<AcademicReadiness> => {
    const response = await apiClient.get('/api/performance/readiness');
    return response.data.data ?? response.data;
  },

  getAiAnalysis: async (): Promise<AiPerformanceAnalysis> => {
    const response = await apiClient.get('/api/performance/ai-analysis');
    return response.data.data ?? response.data;
  },
};


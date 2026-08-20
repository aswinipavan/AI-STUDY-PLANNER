import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceApi } from '@/api/performance.api';
import { QK } from '@/constants/queryKeys';

export const usePerformanceReport = () => {
  return useQuery({
    queryKey: QK.performance,
    queryFn: performanceApi.getReport,
    staleTime: 10 * 60 * 1000, // 10 min — reports don't change often
  });
};

export const usePriority = () => {
  return useQuery({
    queryKey: QK.priority,
    queryFn: performanceApi.getPriority,
  });
};

export const useAcademicReadiness = () => {
  return useQuery({
    queryKey: QK.readiness,
    queryFn: performanceApi.getReadiness,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAiPerformanceAnalysis = () => {
  return useQuery({
    queryKey: QK.aiAnalysis,
    queryFn: performanceApi.getAiAnalysis,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAddMark = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: performanceApi.addMark,
    // Invalidate report, priority, readiness, and analysis after new mark
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.performance });
      qc.invalidateQueries({ queryKey: QK.priority });
      qc.invalidateQueries({ queryKey: QK.readiness });
      qc.invalidateQueries({ queryKey: QK.aiAnalysis });
    },
  });
};


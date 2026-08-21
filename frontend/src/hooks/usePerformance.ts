import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceApi } from '@/api/performance.api';
import { QK } from '@/constants/queryKeys';
import { useBackendHealth } from '@/hooks/useBackendHealth';

export const usePerformanceReport = () => {
  const { isReady } = useBackendHealth();
  return useQuery({
    queryKey: QK.performance,
    queryFn: performanceApi.getReport,
    staleTime: 10 * 60 * 1000, // 10 min — reports don't change often
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

export const usePriority = () => {
  const { isReady } = useBackendHealth();
  return useQuery({
    queryKey: QK.priority,
    queryFn: performanceApi.getPriority,
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

export const useAcademicReadiness = () => {
  const { isReady } = useBackendHealth();
  return useQuery({
    queryKey: QK.readiness,
    queryFn: performanceApi.getReadiness,
    staleTime: 5 * 60 * 1000,
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

export const useAiPerformanceAnalysis = () => {
  const { isReady } = useBackendHealth();
  return useQuery({
    queryKey: QK.aiAnalysis,
    queryFn: performanceApi.getAiAnalysis,
    staleTime: 5 * 60 * 1000,
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
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

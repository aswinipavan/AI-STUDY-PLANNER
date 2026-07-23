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

export const useAddMark = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: performanceApi.addMark,
    // Invalidate both report and priority after new mark
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.performance });
      qc.invalidateQueries({ queryKey: QK.priority });
    },
  });
};

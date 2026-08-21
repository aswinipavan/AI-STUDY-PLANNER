import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsApi } from '@/api/subjects.api';
import { QK } from '@/constants/queryKeys';
import { Subject } from '@/types/api.types';
import { useBackendHealth } from '@/hooks/useBackendHealth';

export const useSubjects = () => {
  const { isReady } = useBackendHealth();
  return useQuery({ 
    queryKey: QK.subjects, 
    queryFn: subjectsApi.getAll,
    staleTime: 5 * 60 * 1000,
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

export const useCreateSubject = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.subjects }),
  });
};

export const useDeleteSubject = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: subjectsApi.remove,
    onMutate: async (id) => {
      // optimistic update
      await qc.cancelQueries({ queryKey: QK.subjects });
      
      const prev = qc.getQueryData<Subject[]>(QK.subjects);
      
      qc.setQueryData(QK.subjects, (old: Subject[] | undefined) => 
        old ? old.filter(s => s.id !== id) : []
      );
      
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.subjects, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK.subjects }),
  });
};

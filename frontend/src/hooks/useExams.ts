import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examsApi } from '@/api/exams.api';
import { QK } from '@/constants/queryKeys';
import { Exam } from '@/types/api.types';

export const useExams = () =>
  useQuery({
    queryKey: QK.exams,
    queryFn: examsApi.getUpcoming,
    staleTime: 5 * 60 * 1000,
  });

export const useCreateExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: examsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.exams }),
  });
};

export const useDeleteExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: examsApi.remove,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: QK.exams });
      const prev = qc.getQueryData<Exam[]>(QK.exams);
      qc.setQueryData(QK.exams, (old: Exam[] | undefined) =>
        old ? old.filter((e) => e.id !== id) : []
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.exams, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK.exams }),
  });
};

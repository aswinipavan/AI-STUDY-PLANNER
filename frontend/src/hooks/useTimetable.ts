import { useMutation, useQueryClient } from '@tanstack/react-query';
import { timetableApi } from '@/api/timetable.api';
import { QK } from '@/constants/queryKeys';
import { useRouter } from 'next/navigation';
import { Timetable } from '@/types/api.types';

export const useGenerateTimetable = () => {
  const qc = useQueryClient();
  const router = useRouter();
  
  return useMutation({
    mutationFn: timetableApi.generate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.timetable });
      router.push('/timetable'); // navigate to viewer
    },
  });
};

export const useUpdateSlot = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'pending' | 'completed' | 'skipped' }) => 
      timetableApi.updateSlotStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: QK.timetable });
      
      const prev = qc.getQueryData<Timetable>(QK.timetable);
      
      qc.setQueryData(QK.timetable, (old: Timetable | undefined) => {
        if (!old) return old;
        return {
          ...old,
          slots: old.slots.map(s => s.id === id ? { ...s, status } : s)
        };
      });
      
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.timetable, ctx.prev);
    },
  });
};

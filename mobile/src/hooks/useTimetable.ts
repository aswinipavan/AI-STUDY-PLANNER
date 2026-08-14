import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {QK} from '@/constants/queryKeys';
import {CONFIG} from '@/constants/config';
import {
  getActiveTimetable,
  generateAiTimetable,
  toggleSlotComplete,
  deleteTimetable,
} from '@/api/timetable.api';
import type {TimetableRequest} from '@/types/timetable.types';

/** Fetch the active timetable (includes all slots) */
export function useActiveTimetable() {
  return useQuery({
    queryKey: QK.TIMETABLE_ACTIVE,
    queryFn: getActiveTimetable,
    staleTime: CONFIG.STALE_TIME.TIMETABLE,
    retry: 1,
  });
}

/** Generate a new AI timetable */
export function useGenerateTimetable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: TimetableRequest) => generateAiTimetable(request),
    onSuccess: timetable => {
      queryClient.setQueryData(QK.TIMETABLE_ACTIVE, timetable);
      queryClient.invalidateQueries({queryKey: QK.TIMETABLE_ALL});
    },
  });
}

/**
 * Toggle slot completion status.
 * Uses optimistic update for instant feedback.
 */
export function useToggleSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => toggleSlotComplete(slotId),
    onMutate: async (slotId: string) => {
      // Optimistically flip isCompleted
      await queryClient.cancelQueries({queryKey: QK.TIMETABLE_ACTIVE});
      const previous = queryClient.getQueryData(QK.TIMETABLE_ACTIVE);
      queryClient.setQueryData(QK.TIMETABLE_ACTIVE, (old: any) => {
        if (!old) {return old;}
        return {
          ...old,
          slots: old.slots.map((s: any) =>
            s.id === slotId ? {...s, isCompleted: !s.isCompleted} : s,
          ),
        };
      });
      return {previous};
    },
    onError: (_err, _slotId, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(QK.TIMETABLE_ACTIVE, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: QK.TIMETABLE_ACTIVE});
    },
  });
}

/** Delete a timetable */
export function useDeleteTimetable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (timetableId: string) => deleteTimetable(timetableId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QK.TIMETABLE_ACTIVE});
      queryClient.invalidateQueries({queryKey: QK.TIMETABLE_ALL});
    },
  });
}

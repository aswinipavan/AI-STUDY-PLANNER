import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timetableApi } from '@/api/timetable.api';
import { QK } from '@/constants/queryKeys';
import { useRouter } from 'next/navigation';
import { AdaptationTrigger, Timetable } from '@/types/api.types';

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

/**
 * Re-plans the remaining horizon and returns the reasons it changed.
 *
 * Deliberately a mutation the student triggers, not something that fires on
 * every completed session: rewriting the schedule underneath someone who is
 * looking at it is disorienting, and a request per slot toggle is exactly the
 * kind of API storm that makes a page feel broken. The caller decides when —
 * a visible "Re-plan" control, or after an event that genuinely invalidates the
 * plan (new material processed, an exam date moved).
 */
export const useAdaptTimetable = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (trigger: AdaptationTrigger = 'MANUAL') => timetableApi.adapt(trigger),
    onSuccess: (result) => {
      // Nothing moved — no point refetching four queries to learn that.
      if (!result.adapted) return;
      qc.invalidateQueries({ queryKey: QK.timetable });
      qc.invalidateQueries({ queryKey: QK.timetableInsights });
      qc.invalidateQueries({ queryKey: QK.priority });
      qc.invalidateQueries({ queryKey: QK.readiness });
    },
  });
};

/**
 * Per-subject coverage, readiness and priority — the signals behind the plan.
 * Read-only, so it is safe to render anywhere without changing the schedule.
 */
export const useTimetableInsights = (enabled = true) =>
  useQuery({
    queryKey: QK.timetableInsights,
    queryFn: timetableApi.getInsights,
    enabled,
    // These move when marks, materials or sessions change, not second to second.
    staleTime: 60_000,
  });

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { revisionApi } from '@/api/revision.api';
import { CompleteRevisionRequest, SlotRevisionResponse } from '@/types/api.types';

export function useSlotRevision(slotId: string, enabled: boolean = true) {
  return useQuery<SlotRevisionResponse>({
    queryKey: ['slotRevision', slotId],
    queryFn: () => revisionApi.getSlotRevision(slotId),
    enabled: Boolean(slotId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompleteRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slotId, payload }: { slotId: string; payload: CompleteRevisionRequest }) =>
      revisionApi.completeSlotRevision(slotId, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['slotRevision', variables.slotId], data);
      queryClient.invalidateQueries({ queryKey: ['activeTimetable'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

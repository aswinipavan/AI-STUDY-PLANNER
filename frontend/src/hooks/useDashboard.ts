import { useQuery } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import { timetableApi } from '@/api/timetable.api';
import { examsApi } from '@/api/exams.api';
import { performanceApi } from '@/api/performance.api';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { useBackendHealth } from '@/hooks/useBackendHealth';

export function useActiveTimetable() {
  const { isReady } = useBackendHealth();
  return useQuery({
    queryKey: QK.timetable,
    queryFn: () => timetableApi.getActive(),
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

export function useUpcomingExams() {
  const { isReady } = useBackendHealth();
  return useQuery({
    queryKey: QK.exams,
    queryFn: () => examsApi.getUpcoming(),
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

export function usePrioritySubjects() {
  const { isReady } = useBackendHealth();
  return useQuery({
    queryKey: QK.priority,
    queryFn: () => performanceApi.getPriority(),
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

export function useSubscriptionStatus() {
  const { isReady } = useBackendHealth();
  return useQuery({
    queryKey: QK.subscription,
    queryFn: () => subscriptionsApi.getStatus(),
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

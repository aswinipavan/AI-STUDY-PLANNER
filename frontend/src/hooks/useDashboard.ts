import { useSuspenseQuery } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import { timetableApi } from '@/api/timetable.api';
import { examsApi } from '@/api/exams.api';
import { performanceApi } from '@/api/performance.api';
import { subscriptionsApi } from '@/api/subscriptions.api';

export function useActiveTimetable() {
  return useSuspenseQuery({
    queryKey: QK.timetable,
    queryFn: () => timetableApi.getActive(),
  });
}

export function useUpcomingExams() {
  return useSuspenseQuery({
    queryKey: QK.exams,
    queryFn: () => examsApi.getUpcoming(),
  });
}

export function usePrioritySubjects() {
  return useSuspenseQuery({
    queryKey: QK.priority,
    queryFn: () => performanceApi.getPriority(),
  });
}

export function useSubscriptionStatus() {
  return useSuspenseQuery({
    queryKey: QK.subscription,
    queryFn: () => subscriptionsApi.getStatus(),
  });
}

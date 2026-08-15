import {useQuery} from '@tanstack/react-query';
import {QK} from '@/constants/queryKeys';
import {
  getPerformanceReport,
  getHistoricalSnapshots,
  getPrioritySubjects,
} from '@/api/performance.api';

/** Fetch student performance report */
export function usePerformanceReport() {
  return useQuery({
    queryKey: QK.PERFORMANCE_REPORT,
    queryFn: getPerformanceReport,
  });
}

/** Fetch historical snapshots */
export function usePerformanceHistory() {
  return useQuery({
    queryKey: QK.PERFORMANCE_HISTORY,
    queryFn: getHistoricalSnapshots,
  });
}

/** Fetch priority/weakest subjects */
export function usePrioritySubjects() {
  return useQuery({
    queryKey: QK.PERFORMANCE_PRIORITY,
    queryFn: getPrioritySubjects,
  });
}

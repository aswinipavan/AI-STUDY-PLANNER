import apiClient from './apiClient';
import type {ApiResponse} from '@/types/api.types';
import type {
  PerformanceResponse,
  PerformanceSnapshot,
} from '@/types/performance.types';
import type {SubjectResponse} from '@/types/student.types';

/**
 * Performance & Analytics API
 */

/** GET /api/performance/report */
export async function getPerformanceReport(): Promise<PerformanceResponse> {
  const res = await apiClient.get<ApiResponse<PerformanceResponse>>(
    '/api/performance/report',
  );
  return res.data.data;
}

/** GET /api/performance/history */
export async function getHistoricalSnapshots(): Promise<PerformanceSnapshot[]> {
  const res = await apiClient.get<ApiResponse<PerformanceSnapshot[]>>(
    '/api/performance/history',
  );
  return res.data.data;
}

/** GET /api/performance/priority */
export async function getPrioritySubjects(): Promise<SubjectResponse[]> {
  const res = await apiClient.get<ApiResponse<SubjectResponse[]>>(
    '/api/performance/priority',
  );
  return res.data.data;
}

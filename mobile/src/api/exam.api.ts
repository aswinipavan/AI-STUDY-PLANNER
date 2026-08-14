import apiClient from './apiClient';
import type {ApiResponse} from '@/types/api.types';
import type {ExamResponse, ExamRequest} from '@/types/exam.types';

/**
 * Exams API
 * All endpoints require Authorization: Bearer <jwt>
 *
 * NOTE: Backend uses trailing-slash routes /api/exams/
 * (ExamController maps @GetMapping("/"), @PostMapping("/"))
 */

/** GET /api/exams/ — all exams */
export async function getAllExams(): Promise<ExamResponse[]> {
  const res = await apiClient.get<ApiResponse<ExamResponse[]>>('/api/exams/');
  return res.data.data;
}

/** GET /api/exams/upcoming — upcoming (not yet completed) exams */
export async function getUpcomingExams(): Promise<ExamResponse[]> {
  const res = await apiClient.get<ApiResponse<ExamResponse[]>>(
    '/api/exams/upcoming',
  );
  return res.data.data;
}

/** POST /api/exams/ */
export async function createExam(data: ExamRequest): Promise<ExamResponse> {
  const res = await apiClient.post<ApiResponse<ExamResponse>>(
    '/api/exams/',
    data,
  );
  return res.data.data;
}

/** PUT /api/exams/{examId} */
export async function updateExam(
  examId: string,
  data: ExamRequest,
): Promise<ExamResponse> {
  const res = await apiClient.put<ApiResponse<ExamResponse>>(
    `/api/exams/${examId}`,
    data,
  );
  return res.data.data;
}

/** PATCH /api/exams/{examId}/complete */
export async function markExamComplete(examId: string): Promise<ExamResponse> {
  const res = await apiClient.patch<ApiResponse<ExamResponse>>(
    `/api/exams/${examId}/complete`,
  );
  return res.data.data;
}

/** DELETE /api/exams/{examId} */
export async function deleteExam(examId: string): Promise<void> {
  await apiClient.delete(`/api/exams/${examId}`);
}

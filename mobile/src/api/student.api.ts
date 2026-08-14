import apiClient from './apiClient';
import type {ApiResponse} from '@/types/api.types';
import type {
  StudentResponse,
  SubjectResponse,
  SubjectRequest,
  UpdateProfileRequest,
  NotificationPreferencesRequest,
} from '@/types/student.types';

/**
 * Student & Subjects API
 * All endpoints require Authorization: Bearer <jwt> (handled by apiClient interceptor)
 */

/** GET /api/students/me */
export async function getProfile(): Promise<StudentResponse> {
  const res = await apiClient.get<ApiResponse<StudentResponse>>(
    '/api/students/me',
  );
  return res.data.data;
}

/** PUT /api/students/me */
export async function updateProfile(
  data: UpdateProfileRequest,
): Promise<StudentResponse> {
  const res = await apiClient.put<ApiResponse<StudentResponse>>(
    '/api/students/me',
    data,
  );
  return res.data.data;
}

/** PUT /api/students/me/notifications */
export async function updateNotificationPreferences(
  data: NotificationPreferencesRequest,
): Promise<StudentResponse> {
  const res = await apiClient.put<ApiResponse<StudentResponse>>(
    '/api/students/me/notifications',
    data,
  );
  return res.data.data;
}

/** GET /api/students/me/subjects */
export async function getSubjects(): Promise<SubjectResponse[]> {
  const res = await apiClient.get<ApiResponse<SubjectResponse[]>>(
    '/api/students/me/subjects',
  );
  return res.data.data;
}

/** POST /api/students/me/subjects */
export async function createSubject(
  data: SubjectRequest,
): Promise<SubjectResponse> {
  const res = await apiClient.post<ApiResponse<SubjectResponse>>(
    '/api/students/me/subjects',
    data,
  );
  return res.data.data;
}

/** PUT /api/students/me/subjects/{id} */
export async function updateSubject(
  id: string,
  data: SubjectRequest,
): Promise<SubjectResponse> {
  const res = await apiClient.put<ApiResponse<SubjectResponse>>(
    `/api/students/me/subjects/${id}`,
    data,
  );
  return res.data.data;
}

/** DELETE /api/students/me/subjects/{id} */
export async function deleteSubject(id: string): Promise<void> {
  await apiClient.delete(`/api/students/me/subjects/${id}`);
}

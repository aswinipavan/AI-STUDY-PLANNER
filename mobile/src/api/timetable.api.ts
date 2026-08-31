import apiClient from './apiClient';
import {CONFIG} from '@/constants/config';
import type {ApiResponse} from '@/types/api.types';
import type {
  TimetableResponse,
  GenerateTimetableRequest,
  TimetableRequest,
  SlotResponse,
} from '@/types/timetable.types';

const AI_TIMEOUT = {timeout: CONFIG.AI_REQUEST_TIMEOUT_MS};

/**
 * Timetable API
 * All endpoints require Authorization: Bearer <jwt>
 */

/** GET /api/timetable/active */
export async function getActiveTimetable(): Promise<TimetableResponse | null> {
  try {
    const res = await apiClient.get<ApiResponse<TimetableResponse>>(
      '/api/timetable/active',
    );
    return res.data.data ?? null;
  } catch (err: any) {
    // 404 indicates no active timetable has been created yet (valid empty state)
    if (err?.status === 404 || err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/** GET /api/timetable/all */
export async function getAllTimetables(): Promise<TimetableResponse[]> {
  try {
    const res = await apiClient.get<ApiResponse<TimetableResponse[]>>(
      '/api/timetable/all',
    );
    return res.data.data ?? [];
  } catch (err: any) {
    if (err?.status === 404 || err?.response?.status === 404) {
      return [];
    }
    throw err;
  }
}

/** POST /api/timetable/generate */
export async function generateAiTimetable(
  request: GenerateTimetableRequest,
): Promise<TimetableResponse> {
  const res = await apiClient.post<ApiResponse<TimetableResponse>>(
    '/api/timetable/generate',
    request,
    AI_TIMEOUT,
  );
  return res.data.data;
}

/** POST /api/timetable/custom */
export async function createCustomTimetable(
  request: TimetableRequest,
): Promise<TimetableResponse> {
  const res = await apiClient.post<ApiResponse<TimetableResponse>>(
    '/api/timetable/custom',
    request,
  );
  return res.data.data;
}

/**
 * PATCH /api/timetable/slots/{slotId}/complete
 * Toggles slot completion and updates study streak.
 */
export async function toggleSlotComplete(slotId: string): Promise<SlotResponse> {
  const res = await apiClient.patch<ApiResponse<SlotResponse>>(
    `/api/timetable/slots/${slotId}/complete`,
  );
  return res.data.data;
}

/** DELETE /api/timetable/{timetableId} */
export async function deleteTimetable(timetableId: string): Promise<void> {
  await apiClient.delete(`/api/timetable/${timetableId}`);
}

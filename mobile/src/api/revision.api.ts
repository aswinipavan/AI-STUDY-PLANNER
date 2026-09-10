import apiClient from './apiClient';
import {CONFIG} from '@/constants/config';
import type {ApiResponse} from '@/types/api.types';
import type {
  SlotRevisionResponse,
  CompleteRevisionRequest,
} from '@/types/revision.types';

const AI_TIMEOUT = {timeout: CONFIG.AI_REQUEST_TIMEOUT_MS};

/**
 * Slot Revision API (Mobile)
 */

/**
 * GET /api/timetable/slots/{slotId}/revision
 * Retrieves or generates an AI Revision experience for a completed slot.
 */
export async function getSlotRevision(slotId: string): Promise<SlotRevisionResponse> {
  const res = await apiClient.get<ApiResponse<SlotRevisionResponse>>(
    `/api/timetable/slots/${slotId}/revision`,
    AI_TIMEOUT,
  );
  return res.data.data;
}

/**
 * POST /api/timetable/slots/{slotId}/revision/complete
 * Records completion of the revision quiz and its score.
 */
export async function completeSlotRevision(
  slotId: string,
  request: CompleteRevisionRequest,
): Promise<SlotRevisionResponse> {
  const res = await apiClient.post<ApiResponse<SlotRevisionResponse>>(
    `/api/timetable/slots/${slotId}/revision/complete`,
    request,
  );
  return res.data.data;
}
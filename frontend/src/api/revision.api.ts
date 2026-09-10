import { apiClient } from '@/lib/apiClient';
import { SlotRevisionResponse, CompleteRevisionRequest } from '@/types/api.types';

export const revisionApi = {
  getSlotRevision: async (slotId: string): Promise<SlotRevisionResponse> => {
    const response = await apiClient.get(`/api/timetable/slots/${slotId}/revision`);
    return response.data.data ?? response.data;
  },

  completeSlotRevision: async (slotId: string, payload: CompleteRevisionRequest): Promise<SlotRevisionResponse> => {
    const response = await apiClient.post(`/api/timetable/slots/${slotId}/revision/complete`, payload);
    return response.data.data ?? response.data;
  },
};

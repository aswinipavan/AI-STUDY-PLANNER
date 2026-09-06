import { apiClient } from '@/lib/apiClient';
import { SlotVideoRecommendationsResponse } from '@/types/api.types';

export const videoRecommendationsApi = {
  getVideoRecommendations: async (slotId: string): Promise<SlotVideoRecommendationsResponse> => {
    const response = await apiClient.get(`/api/timetable/slots/${slotId}/video-recommendations`);
    return response.data.data ?? response.data;
  },

  refreshVideoRecommendations: async (slotId: string): Promise<SlotVideoRecommendationsResponse> => {
    const response = await apiClient.post(`/api/timetable/slots/${slotId}/video-recommendations/refresh`, {});
    return response.data.data ?? response.data;
  },
};

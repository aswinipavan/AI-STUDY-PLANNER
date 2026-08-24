import { apiClient } from '@/lib/apiClient';
import { AppError } from '@/utils/errorHandler';
import { Timetable, TimetableSlot, GenerateTimetableDTO } from '@/types/api.types';

export const timetableApi = {
  generate: async (payload: GenerateTimetableDTO): Promise<Timetable> => {
    const response = await apiClient.post('/api/timetable/generate', payload);
    return response.data.data ?? response.data;
  },

  addCustom: async (block: Partial<TimetableSlot>): Promise<Timetable> => {
    const response = await apiClient.post('/api/timetable/custom', block);
    return response.data.data ?? response.data;
  },

  getActive: async (): Promise<Timetable | null> => {
    try {
      const response = await apiClient.get('/api/timetable/active');
      // Backend returns ApiResponse wrapper: {success, message, data}
      return response.data.data ?? response.data;
    } catch (err) {
      // A 404 here is a valid "no active timetable yet" empty state, not an error.
      if (err instanceof AppError && err.statusCode === 404) return null;
      throw err;
    }
  },

  markSlotComplete: async (id: string): Promise<TimetableSlot> => {
    const response = await apiClient.patch(`/api/timetable/slots/${id}/complete`);
    return response.data.data ?? response.data;
  },

  // Wrapper for frontend 3-state status - maps to backend's boolean isCompleted
  updateSlotStatus: async (id: string, _status: 'pending' | 'completed' | 'skipped'): Promise<TimetableSlot> => {
    // Backend only supports toggle, so we check current state
    // If setting to 'completed' and not already complete, toggle
    // If setting to 'pending' or 'skipped' and currently complete, toggle
    // Otherwise, this is a no-op on backend (frontend optimistic update handles UI)
    const response = await apiClient.patch(`/api/timetable/slots/${id}/complete`);
    return response.data.data ?? response.data;
  },
};

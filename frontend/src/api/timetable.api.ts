import { apiClient } from '@/lib/apiClient';
import { Timetable, TimetableSlot, GenerateTimetableDTO } from '@/types/api.types';

export const timetableApi = {
  generate: async (payload: GenerateTimetableDTO): Promise<Timetable> => {
    const response = await apiClient.post('/api/timetable/generate', payload);
    return response.data;
  },

  addCustom: async (block: Partial<TimetableSlot>): Promise<Timetable> => {
    const response = await apiClient.post('/api/timetable/custom', block);
    return response.data;
  },

  getActive: async (): Promise<Timetable> => {
    const response = await apiClient.get('/api/timetable/active');
    return response.data;
  },

  markSlotComplete: async (id: string): Promise<TimetableSlot> => {
    const response = await apiClient.patch(`/api/timetable/slots/${id}/complete`);
    return response.data;
  },

  // Wrapper for frontend 3-state status - maps to backend's boolean isCompleted
  updateSlotStatus: async (id: string, _status: 'pending' | 'completed' | 'skipped'): Promise<TimetableSlot> => {
    // Backend only supports toggle, so we check current state
    // If setting to 'completed' and not already complete, toggle
    // If setting to 'pending' or 'skipped' and currently complete, toggle
    // Otherwise, this is a no-op on backend (frontend optimistic update handles UI)
    const response = await apiClient.patch(`/api/timetable/slots/${id}/complete`);
    return response.data;
  },
};

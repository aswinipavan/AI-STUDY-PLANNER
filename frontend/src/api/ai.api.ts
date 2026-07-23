import { apiClient } from '@/lib/apiClient';
import { ChatMessage } from '@/types/api.types';

export const aiApi = {
  chat: async (message: string, sessionId?: string): Promise<{ response: string; sessionId: string }> => {
    const response = await apiClient.post('/api/ai/chat', { message, sessionId });
    return response.data;
  },

  getHistory: async (sessionId: string, offset: number = 0, limit: number = 50): Promise<ChatMessage[]> => {
    const response = await apiClient.get(`/api/ai/chat/history`, {
      params: { sessionId, offset, limit },
    });
    return response.data;
  },
};

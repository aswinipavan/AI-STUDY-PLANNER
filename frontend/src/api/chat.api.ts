import { apiClient } from '@/lib/apiClient';
import { ChatMessage } from '@/types/api.types';

export const chatApi = {
  getHistory: async (sessionId: string, offset: number = 0, limit: number = 50): Promise<ChatMessage[]> => {
    const response = await apiClient.get(`/api/ai/chat/history`, {
      params: { sessionId, offset, limit },
    });
    return response.data;
  },

  sendMessage: async (payload: { message: string; sessionId?: string }): Promise<{ message: ChatMessage; sessionId: string }> => {
    const response = await apiClient.post('/api/ai/chat', payload);
    return response.data; // Expected to return the new message and the sessionId (in case a new session was created)
  },
};

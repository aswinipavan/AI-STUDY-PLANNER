import { apiClient } from '@/lib/apiClient';
import { ChatMessage } from '@/types/api.types';

export const aiApi = {
  chat: async (message: string, sessionId?: string): Promise<{ response: string; sessionId: string }> => {
    const response = await apiClient.post('/api/ai/chat', { message, sessionId });
    const responseData = response.data?.data || response.data;
    return {
      response: responseData.reply || '',
      sessionId: responseData.sessionId || sessionId || 'temp',
    };
  },

  getHistory: async (sessionId: string, offset: number = 0, limit: number = 50): Promise<ChatMessage[]> => {
    const response = await apiClient.get(`/api/ai/chat/history`, {
      params: { sessionId, offset, limit },
    });
    const rawHistory = response.data?.data || [];
    return rawHistory.map((item: any) => ({
      id: item.id || String(Math.random()),
      role: item.role,
      content: item.message || '',
      sessionId: item.sessionId || sessionId,
      timestamp: item.createdAt || new Date().toISOString(),
    }));
  },
};

import { apiClient } from '@/lib/apiClient';
import { ChatMessage, ChatSession } from '@/types/api.types';

interface RawHistoryItem {
  id?: string;
  role: 'user' | 'assistant';
  message?: string;
  sessionId?: string;
  createdAt?: string;
}

interface RawSessionItem {
  sessionId: string;
  title: string;
  createdAt: string;
  lastMessage?: string;
}

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
    const rawHistory: RawHistoryItem[] = response.data?.data || [];
    return rawHistory.map((item) => ({
      id: item.id || String(Math.random()),
      role: item.role,
      content: item.message || '',
      sessionId: item.sessionId || sessionId,
      timestamp: item.createdAt || new Date().toISOString(),
    }));
  },

  getSessions: async (): Promise<ChatSession[]> => {
    const response = await apiClient.get('/api/ai/chat/sessions');
    const sessions: RawSessionItem[] = response.data?.data || [];
    return sessions.map((session) => ({
      id: session.sessionId,
      title: session.title,
      createdAt: session.createdAt,
      lastMessage: session.lastMessage,
    }));
  },
};

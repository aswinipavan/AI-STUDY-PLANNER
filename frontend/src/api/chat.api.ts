import { apiClient } from '@/lib/apiClient';
import { ChatMessage } from '@/types/api.types';

export const chatApi = {
  getHistory: async (sessionId: string, offset: number = 0, limit: number = 50): Promise<ChatMessage[]> => {
    const response = await apiClient.get(`/api/ai/chat/history`, {
      params: { sessionId, offset, limit },
    });
    // Backend wraps response in ApiResponse<List<ChatHistory>>: { success: true, data: [...] }
    const rawHistory = response.data?.data || [];
    return rawHistory.map((item: any) => ({
      id: item.id || String(Math.random()),
      role: item.role,
      content: item.message || item.content || '',
      sessionId: item.sessionId || sessionId,
      timestamp: item.createdAt || item.timestamp || new Date().toISOString(),
    }));
  },

  sendMessage: async (payload: { message: string; sessionId?: string; materialId?: string }): Promise<{ message: ChatMessage; sessionId: string }> => {
    const response = await apiClient.post(`/api/ai/chat`, payload, {
      timeout: 60000, // 60s timeout for AI LLM reasoning
    });
    // Backend returns ApiResponse<AiChatResponse>: { success: true, data: { reply: "...", sessionId: "...", timestamp: "..." } }
    const responseData = response.data?.data || response.data;
    
    return {
      message: {
        id: String(Date.now()),
        role: 'assistant',
        content: responseData.reply || '',
        sessionId: responseData.sessionId || payload.sessionId || 'temp',
        timestamp: responseData.timestamp || new Date().toISOString(),
      },
      sessionId: responseData.sessionId || payload.sessionId || 'temp',
    };
  },
};

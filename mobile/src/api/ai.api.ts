import apiClient from './apiClient';
import type {ApiResponse} from '@/types/api.types';
import type {
  ChatRequest,
  AiChatResponse,
  ChatHistoryItem,
} from '@/types/ai.types';

/**
 * AI Assistant API
 */

/** POST /api/ai/chat */
export async function sendChatMessage(
  request: ChatRequest,
): Promise<AiChatResponse> {
  const res = await apiClient.post<ApiResponse<AiChatResponse>>(
    '/api/ai/chat',
    request,
  );
  return res.data.data;
}

/** GET /api/ai/chat/history */
export async function getChatHistory(
  sessionId: string,
  offset = 0,
  limit = 50,
): Promise<ChatHistoryItem[]> {
  const res = await apiClient.get<ApiResponse<ChatHistoryItem[]>>(
    '/api/ai/chat/history',
    {
      params: {sessionId, offset, limit},
    },
  );
  return res.data.data;
}

/** DELETE /api/ai/chat/history */
export async function clearChatHistory(sessionId: string): Promise<void> {
  await apiClient.delete('/api/ai/chat/history', {
    params: {sessionId},
  });
}

/** GET /api/ai/chat/session */
export async function getNewChatSessionId(): Promise<string> {
  const res = await apiClient.get<ApiResponse<string>>('/api/ai/chat/session');
  return res.data.data;
}

/** GET /api/ai/motivation */
export async function getDailyMotivation(): Promise<string> {
  const res = await apiClient.get<ApiResponse<string>>('/api/ai/motivation');
  return res.data.data;
}

/** GET /api/ai/exam-prep-plan */
export async function getExamPrepPlan(): Promise<string> {
  const res = await apiClient.get<ApiResponse<string>>('/api/ai/exam-prep-plan');
  return res.data.data;
}

/** POST /api/ai/analyze-performance */
export async function analyzePerformance(): Promise<string> {
  const res = await apiClient.post<ApiResponse<string>>(
    '/api/ai/analyze-performance',
  );
  return res.data.data;
}

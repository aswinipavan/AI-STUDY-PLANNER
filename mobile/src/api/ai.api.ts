import apiClient from './apiClient';
import {CONFIG} from '@/constants/config';
import type {ApiResponse} from '@/types/api.types';
import type {
  ChatRequest,
  AiChatResponse,
  ChatHistoryItem,
} from '@/types/ai.types';

/**
 * AI Assistant API
 *
 * Every call goes to our own backend, which holds the provider credentials and
 * decides between AgentRouter and Groq. No provider key is ever present here.
 *
 * The text-generating endpoints override the default 15s timeout: the backend may
 * spend that long on the primary provider alone before falling back, so a shorter
 * client deadline would discard an answer that was on its way.
 */
const AI_TIMEOUT = {timeout: CONFIG.AI_REQUEST_TIMEOUT_MS};

/** POST /api/ai/chat */
export async function sendChatMessage(
  request: ChatRequest,
): Promise<AiChatResponse> {
  const res = await apiClient.post<ApiResponse<AiChatResponse>>(
    '/api/ai/chat',
    request,
    AI_TIMEOUT,
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
  const res = await apiClient.get<ApiResponse<string>>(
    '/api/ai/motivation',
    AI_TIMEOUT,
  );
  return res.data.data;
}

/** GET /api/ai/exam-prep-plan */
export async function getExamPrepPlan(): Promise<string> {
  const res = await apiClient.get<ApiResponse<string>>(
    '/api/ai/exam-prep-plan',
    AI_TIMEOUT,
  );
  return res.data.data;
}

/** POST /api/ai/analyze-performance */
export async function analyzePerformance(): Promise<string> {
  const res = await apiClient.post<ApiResponse<string>>(
    '/api/ai/analyze-performance',
    undefined,
    AI_TIMEOUT,
  );
  return res.data.data;
}

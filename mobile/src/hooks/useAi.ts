import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {QK} from '@/constants/queryKeys';
import {
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
  getNewChatSessionId,
  getDailyMotivation,
  getExamPrepPlan,
  analyzePerformance,
} from '@/api/ai.api';
import type {ChatRequest} from '@/types/ai.types';

/** Fetch daily motivation tip */
export function useDailyMotivation() {
  return useQuery({
    queryKey: QK.MOTIVATION,
    queryFn: getDailyMotivation,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/** Fetch AI Exam Prep Plan */
export function useExamPrepPlan() {
  return useQuery({
    queryKey: QK.EXAM_PREP_PLAN,
    queryFn: getExamPrepPlan,
    staleTime: 1000 * 60 * 30, // 30 min
  });
}

/** Fetch chat history for a session */
export function useChatHistory(sessionId?: string) {
  return useQuery({
    queryKey: sessionId ? QK.CHAT_HISTORY(sessionId) : ['chat', 'history', 'none'],
    queryFn: () => (sessionId ? getChatHistory(sessionId) : Promise.resolve([])),
    enabled: Boolean(sessionId),
  });
}

/** Send chat message mutation */
export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ChatRequest) => sendChatMessage(request),
    onSuccess: (data) => {
      if (data.sessionId) {
        queryClient.invalidateQueries({
          queryKey: QK.CHAT_HISTORY(data.sessionId),
        });
      }
    },
  });
}

/** Clear chat history */
export function useClearChatHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => clearChatHistory(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.setQueryData(QK.CHAT_HISTORY(sessionId), []);
    },
  });
}

/** Trigger AI performance analysis */
export function useAnalyzePerformance() {
  return useMutation({
    mutationFn: analyzePerformance,
  });
}

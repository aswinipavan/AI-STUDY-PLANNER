import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/api/chat.api';
import { aiApi } from '@/api/ai.api';
import { ChatMessage, ChatSession } from '@/types/api.types';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export interface ChatState {
  messages: ChatMessage[];
  inputText: string;
  isThinking: boolean;
  sessionId: string | null;
}

export const useChatSessions = () => {
  return useQuery<ChatSession[]>({
    queryKey: ['chat-sessions'],
    queryFn: aiApi.getSessions,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useChatHistory = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['chat-history', sessionId],
    queryFn: () => chatApi.getHistory(sessionId!),
    enabled: !!sessionId,
  });
};

export const useChat = (initialSessionId: string | null) => {
  const qc = useQueryClient();
  const router = useRouter();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);

  // Track last loaded sessionId to detect session changes
  const loadedSessionRef = useRef<string | null>(null);

  // Sync initial history when loaded
  const { data: history } = useChatHistory(sessionId);
  
  // FIXED: Reset messages when sessionId changes so history always loads correctly.
  // Previously messages.length === 0 guard prevented re-loading when navigating
  // back to a session that had messages in state from a previous visit.
  useEffect(() => {
    if (history && sessionId && loadedSessionRef.current !== sessionId) {
      setMessages(history);
      loadedSessionRef.current = sessionId;
    }
  }, [history, sessionId]);

  // Reset messages immediately when sessionId prop changes
  useEffect(() => {
    if (initialSessionId !== sessionId) {
      setSessionId(initialSessionId);
      setMessages([]);
      loadedSessionRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId]);


  const { mutateAsync: sendMessageMutation } = useMutation({
    mutationFn: chatApi.sendMessage,
    onSuccess: (data) => {
      // 4. Append response
      setMessages(prev => [...prev, data.message]);
      
      // If a new session was created, update URL and state
      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
        qc.invalidateQueries({ queryKey: ['chat-sessions'] });
        router.push(`/chat/${data.sessionId}`);
      }
    },
    onSettled: () => {
      // 5. setIsThinking(false)
      setIsThinking(false);
    }
  });

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isThinking) return;

    const optimisticMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      sessionId: sessionId || 'temp',
      timestamp: new Date().toISOString(),
    };

    // 1. Append instantly (optimistic)
    setMessages(prev => [...prev, optimisticMessage]);
    const currentInput = inputText;
    setInputText('');
    
    // 2. setIsThinking(true)
    setIsThinking(true);

    try {
      // 3. POST /api/ai/chat
      await sendMessageMutation({ 
        message: currentInput.trim(), 
        sessionId: sessionId || undefined 
      });
    } catch (err) {
      // Handle error (e.g. show error bubble)
      setIsThinking(false);
      console.error("Failed to send message", err);
    }
  }, [inputText, isThinking, sessionId, sendMessageMutation]);

  return {
    messages,
    inputText,
    setInputText,
    isThinking,
    sessionId,
    sendMessage,
  };
};

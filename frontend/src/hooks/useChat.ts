import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/api/chat.api';
import { aiApi } from '@/api/ai.api';
import { ChatMessage, ChatSession } from '@/types/api.types';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBackendHealth } from '@/hooks/useBackendHealth';

export interface ChatState {
  messages: ChatMessage[];
  inputText: string;
  isThinking: boolean;
  sessionId: string | null;
}

export const useChatSessions = () => {
  const { isReady } = useBackendHealth();
  return useQuery<ChatSession[]>({
    queryKey: ['chat-sessions'],
    queryFn: aiApi.getSessions,
    staleTime: 30 * 1000, // 30 seconds
    enabled: isReady,
  });
};

export const useChatHistory = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['chat-history', sessionId],
    queryFn: () => chatApi.getHistory(sessionId!),
    enabled: !!sessionId,
  });
};

export interface AttachedMaterial {
  id: string;
  title: string;
  fileName: string;
  fileUrl?: string;
  fileType?: string;
  fileSizeBytes?: number;
  thumbnailUrl?: string;
  processingStatus?: 'SELECTED' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
}

export const useChat = (initialSessionId: string | null) => {
  const qc = useQueryClient();
  const router = useRouter();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [attachedMaterial, setAttachedMaterial] = useState<AttachedMaterial | null>(null);

  // Track last loaded sessionId to detect session changes
  const loadedSessionRef = useRef<string | null>(null);

  // Sync initial history when loaded
  const { data: history } = useChatHistory(sessionId);
  
  // FIXED: Reset messages when sessionId changes so history always loads correctly.
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
    if ((!inputText.trim() && !attachedMaterial) || isThinking) return;

    let messageContent = inputText.trim();
    const isImage = attachedMaterial?.fileType?.includes('image') || 
                    attachedMaterial?.fileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

    if (attachedMaterial && !messageContent) {
      if (isImage) {
        messageContent = `Please review and explain this study diagram/image: "${attachedMaterial.title || attachedMaterial.fileName}"`;
      } else {
        messageContent = `Please review and summarize the attached study material: "${attachedMaterial.title || attachedMaterial.fileName}"`;
      }
    }

    const attachBadge = isImage ? '📷 **Attached Image:**' : '📄 **Attached Document:**';
    const optimisticMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: attachedMaterial 
        ? `${attachBadge} [${attachedMaterial.title || attachedMaterial.fileName}]\n\n${messageContent}`
        : messageContent,
      sessionId: sessionId || 'temp',
      timestamp: new Date().toISOString(),
    };

    // 1. Append instantly (optimistic)
    setMessages(prev => [...prev, optimisticMessage]);
    const currentInput = messageContent;
    const currentMaterialId = attachedMaterial?.id;
    setInputText('');
    setAttachedMaterial(null);
    
    // 2. setIsThinking(true)
    setIsThinking(true);

    try {
      // 3. POST /api/ai/chat
      await sendMessageMutation({ 
        message: currentInput, 
        sessionId: sessionId || undefined,
        materialId: currentMaterialId
      });
    } catch (err: unknown) {
      setIsThinking(false);

      // Determine if this is an auth error (401 or 403)
      const isAuthError = err instanceof Error && 
        (err.message.includes('Session expired') || err.message.includes('sign in'));
      
      // Determine if it's a network error
      const isNetworkError = err instanceof Error && 
        (err.message.includes('reach the server') || err.message.includes('timed out'));

      let displayMessage: string;

      if (isAuthError) {
        // Auth errors: guide the user to re-login; also attempt a background token refresh
        displayMessage = '🔐 Your session has expired. Please **sign out and sign back in** to continue chatting.';
        // Attempt silent refresh so next message works without page reload
        try {
          const { auth } = await import('@/lib/firebase');
          const currentUser = auth.currentUser;
          if (currentUser) {
            const freshToken = await currentUser.getIdToken(true);
            await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ firebaseToken: freshToken }),
            });
            // Retry succeeded — clear error message and try sending again
            displayMessage = '🔄 Session refreshed. Please send your message again.';
          }
        } catch {
          // Silent refresh failed — keep the re-login message
        }
      } else if (isNetworkError) {
        displayMessage = '📡 Unable to reach the AI service. Please check your connection and try again.';
      } else {
        displayMessage = err instanceof Error ? err.message : '⚠️ Unable to generate a response. Please try again.';
      }

      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'assistant',
          content: displayMessage,
          sessionId: sessionId || 'temp',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [inputText, isThinking, sessionId, attachedMaterial, sendMessageMutation]);

  return {
    messages,
    inputText,
    setInputText,
    isThinking,
    sessionId,
    attachedMaterial,
    setAttachedMaterial,
    sendMessage,
  };
};

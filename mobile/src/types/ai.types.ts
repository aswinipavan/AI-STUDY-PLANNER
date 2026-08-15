export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface AiChatResponse {
  reply: string;
  sessionId: string;
  timestamp: string;
}

export interface ChatHistoryItem {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  message: string;
  createdAt: string;
}

export interface MessageBubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

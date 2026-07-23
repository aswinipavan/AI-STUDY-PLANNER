'use client';

import React, { useRef, useEffect } from 'react';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ChatInput from '@/components/chat/ChatInput';
import { useChat } from '@/hooks/useChat';
import { Sparkles } from 'lucide-react';
import styles from './chat.module.css';

interface Props {
  initialSessionId: string | null;
}

export default function ChatContainer({ initialSessionId }: Props) {
  const { messages, inputText, setInputText, isThinking, sendMessage } = useChat(initialSessionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  return (
    <div className={styles.chatWrapper}>
      <div 
        ref={scrollRef}
        className={styles.scrollArea}
      >
        <div className={styles.messageList}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.sparkleWrap}>
                <Sparkles size={32} />
              </div>
              <h2 className={styles.emptyTitle}>Ask me anything about your studies!</h2>
              <p className={styles.emptySubtitle}>
                I can help you review your materials, suggest study strategies, or test your knowledge before exams.
              </p>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isThinking && <TypingIndicator />}
            </>
          )}
        </div>
      </div>

      <ChatInput 
        value={inputText}
        onChange={setInputText}
        onSend={sendMessage}
        isThinking={isThinking}
      />
    </div>
  );
}

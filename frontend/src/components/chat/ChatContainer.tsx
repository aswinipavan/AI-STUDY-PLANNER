'use client';

import React, { useRef, useEffect } from 'react';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ChatInput from '@/components/chat/ChatInput';
import { useChat } from '@/hooks/useChat';
import { Sparkles, BookOpen, Target, HelpCircle, FileText } from 'lucide-react';
import styles from './chat.module.css';

interface Props {
  initialSessionId: string | null;
}

const PROMPT_SUGGESTIONS = [
  {
    icon: <BookOpen size={16} />,
    title: 'Explain a Concept',
    prompt: 'Explain a key concept from my syllabus with a clear intuition, worked example, and key takeaways.',
  },
  {
    icon: <Target size={16} />,
    title: 'Study Priority Today',
    prompt: 'Based on my upcoming exams and current performance, what should I prioritize studying today?',
  },
  {
    icon: <HelpCircle size={16} />,
    title: 'Quick Practice Quiz',
    prompt: 'Give me 3 conceptual practice questions with step-by-step solutions to test my understanding.',
  },
  {
    icon: <FileText size={16} />,
    title: 'Summarize Notes',
    prompt: 'Summarize the core formulas, definitions, and exam topics from my latest uploaded study materials.',
  },
];

export default function ChatContainer({ initialSessionId }: Props) {
  const {
    messages,
    inputText,
    setInputText,
    isThinking,
    attachedMaterial,
    setAttachedMaterial,
    sendMessage,
  } = useChat(initialSessionId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom < 120;
  };

  useEffect(() => {
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSelectSuggestion = (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <div className={styles.chatWrapper}>
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className={styles.scrollArea}
      >
        <div className={styles.messageList}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.sparkleWrap}>
                <Sparkles size={32} />
              </div>
              <h2 className={styles.emptyTitle}>Ask your AI Academic Tutor anything!</h2>
              <p className={styles.emptySubtitle}>
                Get structured explanations, worked examples, practice problems, and insights grounded in your study materials.
              </p>

              <div className={styles.promptSuggestionsGrid}>
                {PROMPT_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(item.prompt)}
                    className={styles.promptSuggestionCard}
                    data-testid={`prompt-suggestion-${idx}`}
                  >
                    <span className={styles.suggestionIcon}>{item.icon}</span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
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
        attachedMaterial={attachedMaterial}
        onAttachMaterial={setAttachedMaterial}
      />
    </div>
  );
}

'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ChatInput from '@/components/chat/ChatInput';
import ChatSidebar from '@/components/chat/ChatSidebar';
import { useChat } from '@/hooks/useChat';
import { Sparkles, BookOpen, Target, HelpCircle, FileText, History, Plus, X, Bot } from 'lucide-react';
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
    <div className={styles.chatWrapper} data-testid="chat-wrapper">
      {/* ── CHAT TOPBAR / HEADER ── */}
      <div className={styles.chatHeader} data-testid="chat-header">
        <div className={styles.headerLeft}>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className={styles.mobileHistoryBtn}
            aria-label="Open session history"
            title="Chat History"
            data-testid="mobile-history-toggle-btn"
          >
            <History size={18} />
            <span>History</span>
          </button>

          <div className={styles.tutorIdentity}>
            <div className={styles.tutorAvatar}>
              <Bot size={18} />
            </div>
            <div className={styles.tutorInfo}>
              <h1 className={styles.tutorName}>AI Academic Tutor</h1>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <Link
            href="/chat"
            className={styles.mobileNewChatBtn}
            title="New Chat Session"
            data-testid="mobile-new-chat-btn"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </Link>
        </div>
      </div>

      {/* ── MOBILE SIDEBAR DRAWER OVERLAY ── */}
      {mobileSidebarOpen && (
        <div className={styles.mobileDrawerBackdrop} onClick={() => setMobileSidebarOpen(false)} data-testid="mobile-drawer-backdrop">
          <div
            className={styles.mobileDrawerContent}
            onClick={e => e.stopPropagation()}
            data-testid="mobile-drawer-content"
          >
            <div className={styles.drawerHeader}>
              <span className="font-semibold text-sm">Chat History</span>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className={styles.drawerCloseBtn}
                aria-label="Close history"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ChatSidebar
                onSelectSession={() => setMobileSidebarOpen(false)}
                className="!flex !w-full !border-r-0 !h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── PRIMARY SCROLLABLE MESSAGE REGION ── */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className={styles.scrollArea}
        data-testid="chat-scroll-area"
      >
        <div className={styles.messageList} data-testid="chat-message-list">
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

      {/* ── STICKY ANCHORED COMPOSER (OUTSIDE SCROLL AREA) ── */}
      <div className={styles.composerWrapper} data-testid="chat-composer-wrapper">
        <ChatInput 
          value={inputText}
          onChange={setInputText}
          onSend={sendMessage}
          isThinking={isThinking}
          attachedMaterial={attachedMaterial}
          onAttachMaterial={setAttachedMaterial}
        />
      </div>
    </div>
  );
}

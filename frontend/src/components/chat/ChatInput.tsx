'use client';

import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import styles from './chat.module.css';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  isThinking: boolean;
}

export default function ChatInput({ value, onChange, onSend, isThinking }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputWrap}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything... (Enter to send, Shift+Enter for new line)"
          className={styles.textarea}
          rows={1}
          disabled={isThinking}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || isThinking}
          className={styles.btnSend}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

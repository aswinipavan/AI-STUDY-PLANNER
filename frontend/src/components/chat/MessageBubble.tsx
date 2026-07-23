'use client';

import React from 'react';
import { ChatMessage } from '@/types/api.types';
import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';
import styles from './chat.module.css';

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  
  const rowClass = isUser ? styles.bubbleRowUser : styles.bubbleRowBot;
  const contentClass = isUser ? styles.bubbleContentUser : styles.bubbleContentBot;
  const avatarClass = isUser ? styles.avatarUser : styles.avatarBot;
  const boxClass = isUser ? styles.bubbleBoxUser : styles.bubbleBoxBot;
  const timeClass = isUser ? styles.timestampUser : styles.timestampBot;

  return (
    <div className={`${styles.bubbleRow} ${rowClass}`}>
      <div className={`${styles.bubbleContent} ${contentClass}`}>
        
        <div className={`${styles.avatar} ${avatarClass}`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        <div className={`${styles.bubbleBox} ${boxClass}`}>
          {isUser ? (
            <p className={styles.bubbleText}>{message.content}</p>
          ) : (
            <div className={styles.bubbleProse}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}

          <div className={`${styles.timestamp} ${timeClass}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}

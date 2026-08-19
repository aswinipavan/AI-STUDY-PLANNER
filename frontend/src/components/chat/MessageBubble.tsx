'use client';

import React from 'react';
import { ChatMessage } from '@/types/api.types';
import ReactMarkdown from 'react-markdown';
import { Bot } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import Image from 'next/image';
import styles from './chat.module.css';

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const { user } = useAuthStore();
  
  const rowClass = isUser ? styles.bubbleRowUser : styles.bubbleRowBot;
  const contentClass = isUser ? styles.bubbleContentUser : styles.bubbleContentBot;
  const avatarClass = isUser ? styles.avatarUser : styles.avatarBot;
  const boxClass = isUser ? styles.bubbleBoxUser : styles.bubbleBoxBot;
  const timeClass = isUser ? styles.timestampUser : styles.timestampBot;

  const photo = user?.photoUrl || user?.profilePictureUrl;
  const initial = (user?.name || user?.fullName || 'U').charAt(0).toUpperCase();

  return (
    <div className={`${styles.bubbleRow} ${rowClass}`}>
      <div className={`${styles.bubbleContent} ${contentClass}`}>
        
        <div className={`${styles.avatar} ${avatarClass}`} style={{ overflow: 'hidden' }}>
          {isUser ? (
            photo ? (
              <Image src={photo} alt="User" width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover' }} unoptimized />
            ) : (
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{initial}</span>
            )
          ) : (
            <Bot size={16} />
          )}
        </div>

        <div className={`${styles.bubbleBox} ${boxClass}`}>
          {isUser ? (
            <p className={styles.bubbleText} style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
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


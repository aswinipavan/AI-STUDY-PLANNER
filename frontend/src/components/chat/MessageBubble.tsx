'use client';

import React, { useState } from 'react';
import { ChatMessage } from '@/types/api.types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Bot, Copy, Check, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import AvatarImage from '@/components/common/AvatarImage';
import styles from './chat.module.css';

interface Props {
  message: ChatMessage;
}

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const text = String(children || '').replace(/\n$/, '');
  const isInline = !className;

  if (isInline) {
    return <code className={styles.inlineCode}>{children}</code>;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const language = className?.replace('language-', '') || 'code';

  return (
    <div className={styles.codeBlockWrapper}>
      <div className={styles.codeBlockHeader}>
        <span className={styles.codeLanguage}>{language}</span>
        <button
          onClick={handleCopy}
          className={styles.copyBtn}
          title="Copy code"
          type="button"
          aria-label="Copy code block"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className={styles.codeContent}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const { user } = useAuthStore();
  const [copiedResponse, setCopiedResponse] = useState(false);
  
  const rowClass = isUser ? styles.bubbleRowUser : styles.bubbleRowBot;
  const contentClass = isUser ? styles.bubbleContentUser : styles.bubbleContentBot;
  const avatarClass = isUser ? styles.avatarUser : styles.avatarBot;
  const boxClass = isUser ? styles.bubbleBoxUser : styles.bubbleBoxBot;
  const timeClass = isUser ? styles.timestampUser : styles.timestampBot;

  const photo = user?.photoUrl || user?.profilePictureUrl;
  const initial = (user?.name || user?.fullName || 'U').charAt(0).toUpperCase();

  // Detect material-grounding markers
  const isMaterialGrounded = !isUser && (
    message.content.toLowerCase().includes('from your uploaded') ||
    message.content.toLowerCase().includes('based on your notes') ||
    message.content.toLowerCase().includes('in your uploaded material') ||
    message.content.toLowerCase().includes('study material:')
  );

  const handleCopyFullMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  return (
    <div className={`${styles.bubbleRow} ${rowClass}`}>
      <div className={`${styles.bubbleContent} ${contentClass}`}>
        
        <div className={`${styles.avatar} ${avatarClass}`} style={{ overflow: 'hidden' }}>
          {isUser ? (
            photo ? (
              <AvatarImage
                src={photo}
                alt="User"
                width={32}
                height={32}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
                fallback={<span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{initial}</span>}
              />
            ) : (
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{initial}</span>
            )
          ) : (
            <Bot size={16} />
          )}
        </div>

        <div className={`${styles.bubbleBox} ${boxClass}`}>
          {/* Subtle Material Grounding Badge */}
          {isMaterialGrounded && (
            <div className={styles.materialGroundingBadge} data-testid="grounding-badge">
              <BookOpen size={12} className={styles.groundingIcon} />
              <span>Grounded in your study notes</span>
            </div>
          )}

          {isUser ? (
            <p className={styles.bubbleText} style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
          ) : (
            <div className={styles.bubbleProse}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  // Code blocks and inline code
                  code({ className, children }) {
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                  },
                  // Responsive GFM Tables
                  table({ children }) {
                    return (
                      <div className={styles.tableContainer}>
                        <table className={styles.gfmTable}>{children}</table>
                      </div>
                    );
                  },
                  thead({ children }) {
                    return <thead className={styles.gfmThead}>{children}</thead>;
                  },
                  tbody({ children }) {
                    return <tbody className={styles.gfmTbody}>{children}</tbody>;
                  },
                  tr({ children }) {
                    return <tr className={styles.gfmTr}>{children}</tr>;
                  },
                  th({ children }) {
                    return <th className={styles.gfmTh}>{children}</th>;
                  },
                  td({ children }) {
                    return <td className={styles.gfmTd}>{children}</td>;
                  },
                  // Headings with visual hierarchy
                  h1({ children }) {
                    return <h1 className={styles.proseH1}>{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className={styles.proseH2}>{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className={styles.proseH3}>{children}</h3>;
                  },
                  h4({ children }) {
                    return <h4 className={styles.proseH4}>{children}</h4>;
                  },
                  // Educational Callout Blockquotes
                  blockquote({ children }) {
                    return <blockquote className={styles.proseBlockquote}>{children}</blockquote>;
                  },
                  // Lists
                  ul({ children }) {
                    return <ul className={styles.proseUl}>{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className={styles.proseOl}>{children}</ol>;
                  },
                  li({ children }) {
                    return <li className={styles.proseLi}>{children}</li>;
                  },
                  // Paragraphs
                  p({ children }) {
                    return <p className={styles.proseP}>{children}</p>;
                  },
                  // Links
                  a({ href, children }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className={styles.proseLink}>
                        {children}
                      </a>
                    );
                  },
                  // Dividers
                  hr() {
                    return <hr className={styles.proseHr} />;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Assistant Action Bar */}
          {!isUser && (
            <div className={styles.botActionBar}>
              <button
                type="button"
                onClick={handleCopyFullMessage}
                className={styles.actionBtn}
                title="Copy response"
                aria-label="Copy full AI response"
              >
                {copiedResponse ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
              </button>
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

'use client';

import React from 'react';
import Link from 'next/link';
import { useChatSessions } from '@/hooks/useChat';
import { Plus, MessageSquare } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface ChatSidebarProps {
  onSelectSession?: () => void;
  className?: string;
}

export default function ChatSidebar({ onSelectSession, className = '' }: ChatSidebarProps) {
  const { data: sessions, isLoading } = useChatSessions();
  const pathname = usePathname();

  return (
    <aside
      className={`hidden md:flex w-64 flex-shrink-0 border-r border-border bg-card/50 flex-col h-full min-h-0 overflow-hidden ${className}`}
      data-testid="chat-sidebar"
    >
      <div className="p-4 border-b border-border flex-shrink-0">
        <Link 
          href="/chat"
          onClick={onSelectSession}
          className="flex items-center justify-center space-x-2 w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
          data-testid="new-chat-sidebar-btn"
        >
          <Plus className="w-5 h-5" />
          <span>New Chat</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" data-testid="chat-sidebar-history">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
          Recent Sessions
        </h3>
        
        {isLoading ? (
          <div className="space-y-3 px-2 animate-pulse">
            <div className="h-10 bg-muted rounded-md w-full"></div>
            <div className="h-10 bg-muted rounded-md w-full"></div>
            <div className="h-10 bg-muted rounded-md w-full"></div>
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2">No history yet.</p>
        ) : (
          sessions.map(session => {
            const isActive = pathname.includes(`/chat/${session.id}`);
            return (
              <Link
                key={session.id}
                href={`/chat/${session.id}`}
                onClick={onSelectSession}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-foreground hover:bg-muted/50'
                }`}
                data-testid={`chat-session-${session.id}`}
              >
                <MessageSquare className="w-4 h-4 opacity-70 flex-shrink-0" />
                <span className="truncate text-sm">{session.title}</span>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}

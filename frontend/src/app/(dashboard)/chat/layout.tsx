import React from 'react';
import ChatSidebar from '@/components/chat/ChatSidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-background">
      <ChatSidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

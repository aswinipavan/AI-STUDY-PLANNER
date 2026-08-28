import React from 'react';
import ChatSidebar from '@/components/chat/ChatSidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 h-full w-full bg-background overflow-hidden">
      <ChatSidebar />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

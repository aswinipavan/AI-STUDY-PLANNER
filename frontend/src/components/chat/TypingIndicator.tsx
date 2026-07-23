'use client';

import React from 'react';
import { Bot } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex w-full justify-start mb-6">
      <div className="flex flex-row items-end gap-2">
        
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-muted border border-border text-foreground">
          <Bot className="w-5 h-5" />
        </div>

        <div className="px-5 py-4 rounded-2xl shadow-sm bg-card border border-border rounded-bl-sm flex space-x-1.5 items-center h-11">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}

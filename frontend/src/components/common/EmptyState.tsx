'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 space-y-4">
      {Icon && (
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <p className="text-muted-foreground text-sm max-w-xs">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

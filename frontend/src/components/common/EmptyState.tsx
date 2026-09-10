'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
}

/**
 * Canonical empty state component that explains what belongs here,
 * why it helps, and provides a direct 1-click action button.
 */
export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center animate-in fade-in duration-300">
      {Icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-[var(--app-radius-pill)] bg-primary/10 border border-primary/20 shadow-sm mb-1">
          <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-foreground tracking-tight">
          {title}
        </h3>
      )}
      <p className="max-w-md text-sm text-muted-foreground leading-relaxed px-4">
        {message}
      </p>
      {action && (
        <div className="mt-2">
          <Button onClick={action.onClick} leftIcon={ActionIcon ? <ActionIcon className="h-4 w-4" aria-hidden="true" /> : undefined}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}

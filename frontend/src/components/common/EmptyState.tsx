'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  action?: { label: string; onClick: () => void };
}

/**
 * The one "nothing here yet" panel. Shares its geometry with {@link ErrorState}
 * so the two never look like they came from different apps, and uses the
 * canonical {@link Button} instead of a hand-rolled one.
 */
export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {Icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-[var(--app-radius-pill)] bg-muted">
          <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * The one failure panel. Same geometry as {@link EmptyState}; `role="alert"` so
 * a screen reader announces the failure instead of silently swapping content.
 */
export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-[var(--app-radius-pill)] bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} leftIcon={<RefreshCw aria-hidden="true" />}>
          Retry
        </Button>
      )}
    </div>
  );
}

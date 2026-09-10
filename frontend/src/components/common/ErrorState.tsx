'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  suggestion?: string;
  onRetry?: () => void;
}

/**
 * User-friendly error state with plain-language explanation, actionable recovery guidance,
 * and a direct retry button.
 */
export function ErrorState({
  title = 'Unable to Load Data',
  message = 'We encountered an issue connecting to the server.',
  suggestion = 'Please check your internet connection or try reloading.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 py-16 text-center animate-in fade-in duration-300"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-[var(--app-radius-pill)] bg-destructive/10 border border-destructive/20 shadow-sm mb-1">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="max-w-md text-sm text-muted-foreground leading-relaxed px-4">
        {message}
      </p>
      {suggestion && (
        <p className="max-w-sm text-xs text-muted-foreground/80 -mt-1">
          {suggestion}
        </p>
      )}
      {onRetry && (
        <div className="mt-2">
          <Button variant="outline" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

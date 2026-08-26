'use client';

import React, { useId } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useDialog } from '@/hooks/useDialog';

type ConfirmVariant = 'danger' | 'warning';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'danger',
  confirmLabel = 'Confirm',
}: ConfirmDialogProps) {
  const panelRef = useDialog(isOpen, onClose);
  const titleId = useId();
  const messageId = useId();

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[var(--app-z-overlay)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      style={{ animation: 'fadeIn var(--app-duration-fast) var(--app-ease-out) both' }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="z-[var(--app-z-modal)] w-full max-w-md rounded-[var(--app-radius-xl)] border border-border bg-card p-6 shadow-[var(--shadow-elevated)]"
        style={{ animation: 'scaleIn var(--app-duration-base) var(--app-ease-spring) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div
            className={`rounded-[var(--app-radius-md)] p-2 ${isDanger ? 'bg-destructive/10' : 'bg-amber-500/10'}`}
          >
            {isDanger ? (
              <Trash2 className="h-5 w-5 text-destructive" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
            <X aria-hidden="true" />
          </Button>
        </div>

        <h3 id={titleId} className="mb-2 font-display text-lg font-bold text-foreground">
          {title}
        </h3>
        <p id={messageId} className="mb-6 text-sm text-muted-foreground">
          {message}
        </p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={isDanger ? 'destructive' : 'default'}
            className={`flex-1 ${isDanger ? '' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

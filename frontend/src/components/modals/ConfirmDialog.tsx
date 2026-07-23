'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2 rounded-lg ${variant === 'danger' ? 'bg-destructive/10' : 'bg-amber-500/10'}`}>
            {variant === 'danger'
              ? <Trash2 className="w-5 h-5 text-destructive" />
              : <AlertTriangle className="w-5 h-5 text-amber-500" />
            }
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              variant === 'danger'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

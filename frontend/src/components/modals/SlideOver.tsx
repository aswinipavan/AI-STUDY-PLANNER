'use client';

import React, { useId } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useDialog } from '@/hooks/useDialog';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Right-hand drawer used for the create/edit forms.
 *
 * The panel stays mounted while closed so it can slide out rather than vanish,
 * but it is marked `inert` in that state — otherwise Tab walked straight into a
 * form the user could not see, which is what happened before.
 */
export function SlideOver({ isOpen, onClose, title, children }: SlideOverProps) {
  const panelRef = useDialog(isOpen, onClose);
  const titleId = useId();

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[var(--app-z-overlay)] bg-black/60 backdrop-blur-sm transition-opacity duration-[var(--app-duration-slow)] ease-[var(--app-ease-out)] ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={isOpen || undefined}
        aria-labelledby={titleId}
        inert={!isOpen}
        tabIndex={-1}
        className={`fixed bottom-0 right-0 top-0 z-[var(--app-z-modal)] flex w-full max-w-md flex-col border-l border-border bg-card shadow-[var(--shadow-elevated)] transition-transform duration-[var(--app-duration-slow)] ease-[var(--app-ease-out)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 id={titleId} className="font-display text-xl font-bold text-foreground">
            {title}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel">
            <X aria-hidden="true" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </>
  );
}

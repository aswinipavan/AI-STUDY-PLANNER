'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

import { playSound, type SoundCue } from '@/lib/soundFeedback';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

/**
 * Which cue a toast plays. `null` is silent; omit it to get the type's default.
 * Callers that know what happened should say so — `toast.success('Uploaded',
 * 'uploadComplete')` — so the sound matches the event rather than the surface.
 */
type ToastSound = SoundCue | null | undefined;

interface ToastContextValue {
  toast: {
    success: (msg: string, sound?: ToastSound) => void;
    error: (msg: string, sound?: ToastSound) => void;
    warning: (msg: string, sound?: ToastSound) => void;
    info: (msg: string, sound?: ToastSound) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 4500;

/** Errors stay silent on purpose: a chime on every failure is punishing. */
const DEFAULT_CUE: Record<ToastType, SoundCue | null> = {
  success: 'notification',
  error: null,
  warning: null,
  info: 'notification',
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />,
  info: <Info className="h-4 w-4 text-blue-500" aria-hidden="true" />,
};

const BORDERS: Record<ToastType, string> = {
  success: 'border-green-500/30',
  error: 'border-destructive/30',
  warning: 'border-amber-500/30',
  info: 'border-blue-500/30',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Ids came from `Date.now()`, so two toasts raised in the same millisecond —
  // which is exactly what a Promise.all of failed requests produces — collided
  // as React keys and only one ever rendered.
  const nextId = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType, sound: ToastSound) => {
      const id = `toast-${nextId.current++}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      const cue = sound === undefined ? DEFAULT_CUE[type] : sound;
      if (cue) playSound(cue);

      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, VISIBLE_MS)
      );
    },
    []
  );

  // Nothing cleared these before, so a toast raised just before a navigation
  // left a timer running against an unmounted provider.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  // Memoised: consumers put `toast` in effect dependency arrays, and rebuilding
  // the object every render re-ran those effects — including ones that fire
  // requests — on every single render of the whole tree.
  const value = useMemo<ToastContextValue>(
    () => ({
      toast: {
        success: (msg, sound) => addToast(msg, 'success', sound),
        error: (msg, sound) => addToast(msg, 'error', sound),
        warning: (msg, sound) => addToast(msg, 'warning', sound),
        info: (msg, sound) => addToast(msg, 'info', sound),
      },
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/*
        A live region so toasts are announced, not just drawn. `pointer-events-none`
        on the stack keeps the empty column from swallowing clicks on the page
        underneath — each toast turns pointer events back on for itself.
      */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[var(--app-z-toast)] flex w-full max-w-sm flex-col gap-3"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-center justify-between gap-4 rounded-[var(--app-radius-lg)] border bg-card px-4 py-3 shadow-[var(--shadow-elevated)] ${BORDERS[t.type]} animate-in fade-in slide-in-from-right-4`}
          >
            <div className="flex items-center gap-3">
              {ICONS[t.type]}
              <p className="text-sm font-medium text-foreground">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              data-compact
              className="rounded-[var(--app-radius-sm)] p-1 text-muted-foreground transition-colors duration-[var(--app-duration-fast)] hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

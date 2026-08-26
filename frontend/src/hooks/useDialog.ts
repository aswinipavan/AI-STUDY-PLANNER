'use client';

import { useEffect, useRef } from 'react';

/** Everything focusable, minus anything explicitly removed from the tab order. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The behaviour every dialog in the app shares: Escape closes it, the page
 * behind it stops scrolling, Tab stays inside it, and focus returns to whatever
 * opened it on close.
 *
 * Attach the returned ref to the dialog's panel element. Everything is a no-op
 * while `isOpen` is false, so it is safe to call unconditionally.
 */
export function useDialog(isOpen: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Kept in a ref rather than state: restoring focus must not re-render.
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Escape to close. Held in its own effect so `onClose` changing identity every
  // render (an inline arrow at most call sites) does not tear down the rest.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Lock the page behind the dialog. Without this, scrolling over the backdrop
  // moves the page underneath, which reads as the dialog drifting.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Move focus in on open, keep Tab inside, hand it back on close.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    // Prefer the first real control; fall back to the panel so a screen reader
    // still lands inside the dialog rather than back at the top of the page.
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === firstEl || active === panelRef.current)) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && active === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return panelRef;
}

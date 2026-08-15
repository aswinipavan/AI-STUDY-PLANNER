'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

/**
 * ThemeApplier - bridges the Zustand themeStore → actual DOM .dark class.
 *
 * ROOT CAUSE FIX (Issue 3):
 * The Topbar called useThemeStore().setTheme() which updated Zustand state,
 * but NO component ever read that state and applied/removed the '.dark' CSS
 * class on <html>. So clicking the theme toggle did nothing visible.
 *
 * This component must be mounted at layout level (dashboard layout.tsx).
 * It applies the theme on every render when the store changes.
 */
export function ThemeApplier() {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (t: 'light' | 'dark') => {
      if (t === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      // Also write to localStorage for useTheme hook compatibility
      localStorage.setItem('theme', t);
    };

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');

      // Listen for system preference changes
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        if (useThemeStore.getState().theme === 'system') {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      };
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  // On mount: also sync localStorage → themeStore (for pages that use the old useTheme hook)
  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored && stored !== theme) {
      setTheme(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // renders nothing — effect only
}

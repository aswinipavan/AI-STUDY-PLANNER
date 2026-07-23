'use client';

import { useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  };

  // On mount: read localStorage 'theme' or system preference
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      applyTheme(stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    applyTheme(theme);
  }, []);

  const isDark = () => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  };

  return { toggleTheme, setTheme, isDark };
}

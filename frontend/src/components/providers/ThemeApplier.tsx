'use client';

import { useEffect } from 'react';

import { useThemeStore } from '@/stores/themeStore';

/** The pre-store preference, imported once for users upgrading from it. */
const LEGACY_KEY = 'theme';

/**
 * Keeps the `.dark` class on `<html>` in step with `themeStore` after mount.
 *
 * The first paint is not this component's job — the inline script in the root
 * layout has already applied the right class by the time React runs, which is
 * what stopped dark-mode users seeing a light flash on every hard load. This
 * only handles changes made while the app is open.
 */
export function ThemeApplier() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (dark: boolean) => root.classList.toggle('dark', dark);

    if (theme !== 'system') {
      apply(theme === 'dark');
      return;
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    apply(mql.matches);
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => {
    // One-time import of the old `localStorage['theme']` value, gated on the
    // store never having been written. Running it unconditionally (as this used
    // to) overwrote an explicit "system" choice with the last resolved
    // light/dark value on every single load, so "system" never survived.
    try {
      if (window.localStorage.getItem('theme-storage')) return;
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy === 'light' || legacy === 'dark') setTheme(legacy);
    } catch {
      /* storage unavailable — the default stands */
    }
  }, [setTheme]);

  return null; // effects only
}

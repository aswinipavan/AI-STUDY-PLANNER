'use client';

import { useCallback, useEffect, useState } from 'react';

import { useThemeStore } from '@/stores/themeStore';

export type Theme = 'light' | 'dark' | 'system';

/**
 * Read and write the app's theme.
 *
 * There used to be two sources of truth: this hook owned `localStorage['theme']`
 * and mutated the `.dark` class itself, while the topbar owned `themeStore`.
 * They could disagree, a toggle from here never re-rendered its own caller, and
 * `ThemeApplier` imported the mirror back into the store on every load — which
 * quietly converted an explicit "system" choice into a hard light/dark.
 *
 * Now `themeStore` is the only stored preference, `ThemeApplier` is the only
 * writer of the `.dark` class after mount, and the pre-paint script in the root
 * layout sets that class before the first frame so nothing flashes.
 */
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  // `null` until mounted. The OS preference is not knowable while rendering on
  // the server, and guessing would make the server and client markup disagree.
  const [systemDark, setSystemDark] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  /**
   * What is actually on screen, with `system` resolved — or `null` before mount
   * while the OS preference is still unknown. Render a neutral state for `null`
   * rather than assuming light.
   */
  const resolvedTheme: 'light' | 'dark' | null =
    theme === 'system' ? (systemDark === null ? null : systemDark ? 'dark' : 'light') : theme;

  /**
   * Whether dark is showing right now, straight from the class that the
   * pre-paint script maintains — so it is correct for `system` too.
   *
   * Deliberately a function rather than a value: reading the DOM during render
   * would disagree with the server. Call it from an event handler.
   */
  const isDark = useCallback(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  }, []);

  const toggleTheme = useCallback(() => {
    // Toggle away from what the user can see, not from the stored preference:
    // with "system" selected on a dark OS, flipping to "dark" would look like
    // the button did nothing.
    setTheme(isDark() ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return { theme, resolvedTheme, isDark, setTheme, toggleTheme };
}

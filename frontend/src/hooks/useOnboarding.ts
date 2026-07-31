'use client';

import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_KEY = 'ai-study-planner-onboarding-completed';

export interface UseOnboardingReturn {
  shouldShow: boolean;
  isLoaded: boolean;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  replayOnboarding: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const [shouldShow, setShouldShow] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      setShouldShow(completed !== 'true');
    } catch {
      // If localStorage is unavailable (e.g. SSR or private mode), don't show
      setShouldShow(false);
    }
    setIsLoaded(true);
  }, []);

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Silently fail
    }
    setShouldShow(false);
  }, []);

  const skipOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Silently fail
    }
    setShouldShow(false);
  }, []);

  const replayOnboarding = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_KEY);
    } catch {
      // Silently fail
    }
    setShouldShow(true);
  }, []);

  return { shouldShow, isLoaded, completeOnboarding, skipOnboarding, replayOnboarding };
}

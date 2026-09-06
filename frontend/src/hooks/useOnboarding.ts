'use client';

import { useState, useCallback } from 'react';

const ONBOARDING_KEY = 'ai-study-planner-onboarding-completed';

export interface UseOnboardingReturn {
  shouldShow: boolean;
  isLoaded: boolean;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  replayOnboarding: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const [shouldShow, setShouldShow] = useState<boolean>(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      return completed !== 'true';
    } catch {
      return false;
    }
  });
  const isLoaded = true;

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

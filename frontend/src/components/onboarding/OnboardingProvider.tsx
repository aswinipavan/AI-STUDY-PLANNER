'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { BookOnboarding } from './BookOnboarding';
import { useOnboarding } from '@/hooks/useOnboarding';

/**
 * OnboardingProvider wraps the entire app.
 * Renders BookOnboarding only on first visit (localStorage check).
 * Provides replayOnboarding capability consumed by Settings page.
 */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { shouldShow, isLoaded, completeOnboarding, skipOnboarding } = useOnboarding();

  // Don't render anything until localStorage is checked (avoids SSR flash)
  if (!isLoaded) {
    return <>{children}</>;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {shouldShow && (
          <BookOnboarding
            key="onboarding"
            onComplete={completeOnboarding}
            onSkip={skipOnboarding}
          />
        )}
      </AnimatePresence>
      {/* Children visible behind onboarding (onboarding is fixed overlay) */}
      {children}
    </>
  );
}

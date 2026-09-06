'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { BookOnboarding } from './BookOnboarding';
import { useOnboarding } from '@/hooks/useOnboarding';

/**
 * OnboardingProvider wraps the entire app.
 * Renders BookOnboarding on student app pages (e.g. /dashboard) on first visit.
 * Bypasses on the public marketing landing page (/).
 * Provides replayOnboarding capability consumed by Settings page.
 */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { shouldShow, isLoaded, completeOnboarding, skipOnboarding } = useOnboarding();

  // Do not show onboarding modal on public marketing landing page or login page
  const isPublicPage = pathname === '/' || pathname === '/login';

  if (!isLoaded || isPublicPage) {
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


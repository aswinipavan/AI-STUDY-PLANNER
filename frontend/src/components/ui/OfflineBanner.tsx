'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);

    // Set initial state immediately after mount to prevent hydration mismatch
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Prevent hydration mismatch by only rendering after mount
  if (!isMounted || isOffline === null || !isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center space-x-3 bg-destructive text-destructive-foreground py-2.5 px-4 text-sm font-medium shadow-lg animate-in slide-in-from-top duration-300">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>You are offline. Please check your internet connection.</span>
    </div>
  );
}

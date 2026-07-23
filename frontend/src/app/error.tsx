'use client';

import React from 'react';
import { AppError } from '@/utils/errorHandler';
import { Crown, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const appError = error instanceof AppError ? error : null;

  const config = {
    PREMIUM: {
      icon: <Crown className="w-12 h-12 text-amber-500" />,
      title: 'Premium Feature',
      message: 'This feature requires a Premium subscription.',
      action: <Link href="/subscription" className="btn-primary">Upgrade to Premium</Link>,
    },
    NETWORK: {
      icon: <WifiOff className="w-12 h-12 text-muted-foreground" />,
      title: 'No Connection',
      message: 'You appear to be offline. Please check your internet connection.',
      action: <button onClick={reset} className="btn-primary flex items-center space-x-2"><RefreshCw className="w-4 h-4" /><span>Retry</span></button>,
    },
    SERVER: {
      icon: <AlertTriangle className="w-12 h-12 text-destructive" />,
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Our team has been notified.',
      action: <button onClick={reset} className="btn-primary flex items-center space-x-2"><RefreshCw className="w-4 h-4" /><span>Try Again</span></button>,
    },
  };

  const kind = appError?.code && appError.code in config
    ? config[appError.code as keyof typeof config]
    : config.SERVER;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 p-6">
      <div className="p-5 bg-muted rounded-full">
        {kind.icon}
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">{kind.title}</h2>
        <p className="text-muted-foreground mt-2 max-w-md">{kind.message}</p>
      </div>
      {kind.action}
    </div>
  );
}

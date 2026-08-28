'use client';

import React, { useEffect } from 'react';
import { ViewTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useFirebaseAuth } from '@/components/providers/AuthProvider';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useFirebaseAuth();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const isChatRoute = pathname?.startsWith('/chat');

  useEffect(() => {
    if (!loading && !firebaseUser && !user) {
      router.replace('/login');
    }
  }, [loading, firebaseUser, user, router]);

  if (loading && !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Lets keyboard users reach the page without tabbing the whole nav */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />

        {/* Scrollable Page Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className={
            isChatRoute
              ? "flex-1 flex flex-col min-h-0 overflow-hidden p-0"
              : "flex-1 overflow-y-auto p-4 lg:p-8"
          }
        >
          {/*
            Only the page body animates between routes — the sidebar and topbar
            are anchored in globals.css so navigation never reads as a reload.
            The browser drives it via the View Transitions API; nothing here
            runs JS per frame.
          */}
          <ViewTransition default="page-body">
            <div className={isChatRoute ? "flex-1 flex flex-col min-h-0 h-full w-full" : "mx-auto max-w-7xl"}>
              {children}
            </div>
          </ViewTransition>
        </main>
      </div>
    </div>
  );
}

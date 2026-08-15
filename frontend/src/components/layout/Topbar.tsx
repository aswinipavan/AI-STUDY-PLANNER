'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useQuery } from '@tanstack/react-query';
import { examsApi } from '@/api/exams.api';
import { QK } from '@/constants/queryKeys';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Moon, Sun, Bell, Settings, LogOut, User, CalendarDays } from 'lucide-react';

/**
 * Topbar — fixed for Issues 2, 3:
 * - Theme toggle now calls themeStore.setTheme(), which ThemeApplier bridges to the DOM
 * - Bell button shows upcoming exams dropdown
 * - Avatar now has click dropdown: Settings + Logout
 */
export function Topbar() {
  const { toggleSidebar } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const router = useRouter();

  const [showBell, setShowBell] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Fetch upcoming exams for notification badge
  const { data: upcomingExams = [] } = useQuery({
    queryKey: QK.exams,
    queryFn: examsApi.getUpcoming,
    staleTime: 5 * 60 * 1000,
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setShowAvatar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = theme === 'dark';
  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  const urgentExams = upcomingExams.filter(e => daysUntil(e.examDate) <= 7);

  const handleLogout = async () => {
    setShowAvatar(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="mr-4 rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
          <span className="sr-only">Toggle Sidebar</span>
        </button>
      </div>

      <div className="flex items-center space-x-2">
        {/* Theme Toggle */}
        <button
          id="topbar-theme-toggle"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications Bell */}
        <div className="relative" ref={bellRef}>
          <button
            id="topbar-bell"
            onClick={() => { setShowBell(v => !v); setShowAvatar(false); }}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {urgentExams.length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            )}
          </button>

          {showBell && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-background shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">Upcoming Exams</p>
              </div>
              {upcomingExams.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No upcoming exams 🎉
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {upcomingExams.slice(0, 6).map(exam => {
                    const days = daysUntil(exam.examDate);
                    return (
                      <div key={exam.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors">
                        <CalendarDays size={16} className={days <= 3 ? 'text-destructive' : 'text-primary'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{exam.examName || 'Exam'}</p>
                          <p className="text-xs text-muted-foreground">
                            {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `in ${days} days`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="border-t border-border px-4 py-2">
                <Link
                  href="/exams"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setShowBell(false)}
                >
                  View all exams →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar with Dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            id="topbar-avatar"
            onClick={() => { setShowAvatar(v => !v); setShowBell(false); }}
            className="relative h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
            aria-label="Profile menu"
          >
            {user?.photoUrl ? (
              <Image src={user.photoUrl} alt="Profile" fill className="object-cover" unoptimized />
            ) : (
              <span className="text-sm">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            )}
          </button>

          {showAvatar && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-background shadow-xl z-50 overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground truncate">{user?.name || 'Student'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  onClick={() => setShowAvatar(false)}
                  id="topbar-avatar-settings"
                >
                  <Settings size={16} className="text-muted-foreground" />
                  Settings
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  onClick={() => setShowAvatar(false)}
                  id="topbar-avatar-profile"
                >
                  <User size={16} className="text-muted-foreground" />
                  Edit Profile
                </Link>
              </div>

              <div className="border-t border-border py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  id="topbar-avatar-logout"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

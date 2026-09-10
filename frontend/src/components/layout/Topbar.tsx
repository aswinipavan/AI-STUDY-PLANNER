'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import AvatarImage from '@/components/common/AvatarImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Moon, Sun, Bell, Settings, LogOut, User, CalendarDays, AlertCircle, Users, Sparkles } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * Topbar — fixed for Issues 2, 3:
 * - Theme toggle flips whichever theme is actually showing (see useTheme)
 * - Bell button shows upcoming exams & smart academic notifications dropdown
 * - Avatar now has click dropdown: Settings + Logout
 */
export function Topbar() {
  const { toggleSidebar } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const { toggleTheme } = useTheme();
  const router = useRouter();

  const [showBell, setShowBell] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Backend health gate — prevent API calls while Render is cold-starting
  const { isWaking } = useBackendHealth();

  // Fetch smart academic notifications (gated by backend health)
  const { data: notifications, isLoading: notifLoading } = useNotifications();

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

  const handleLogout = async () => {
    setShowAvatar(false);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuth();
    router.push('/login');
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between px-4"
      style={{
        background: 'hsl(var(--background) / 0.92)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        borderBottom: '1px solid transparent',
        backgroundImage: `
          linear-gradient(hsl(var(--background) / 0.92), hsl(var(--background) / 0.92)),
          linear-gradient(90deg, transparent 0%, hsl(var(--border)) 30%, rgba(0,229,192,0.25) 50%, hsl(var(--border)) 70%, transparent 100%)
        `,
        backgroundOrigin: 'padding-box, border-box',
        backgroundClip: 'padding-box, border-box',
      }}
    >
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
        {/* Theme Toggle — which icon shows is decided by CSS from the `.dark`
            class the pre-paint script sets, so it is right on the first frame
            and stays right when "system" is selected. Doing it from React state
            meant the server and the browser rendered different icons. */}
        <button
          id="topbar-theme-toggle"
          onClick={toggleTheme}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          <Moon size={20} className="dark:hidden" aria-hidden="true" />
          <Sun size={20} className="hidden dark:block" aria-hidden="true" />
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
            {isWaking || notifLoading ? (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" />
            ) : notifications && notifications.length > 0 ? (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse ring-2 ring-destructive/30" />
            ) : null}
          </button>

          {showBell && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-xl z-50 overflow-hidden"
              style={{
                background: 'hsl(var(--card) / 0.98)',
                backdropFilter: 'blur(16px) saturate(1.2)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
                border: '1px solid hsl(var(--border))',
                boxShadow: 'var(--app-elevation-4)',
              }}
            >
              <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                <p className="text-sm font-semibold text-foreground">Smart Notifications</p>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {notifications?.length || 0} alerts
                </span>
              </div>

              {!notifications || notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  All caught up! No urgent alerts 🎉
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                  {notifications.slice(0, 8).map(notif => {
                    const isHigh = notif.priority === 'HIGH';
                    const iconColor = isHigh ? 'text-destructive' : 'text-primary';

                    return (
                      <Link
                        key={notif.id}
                        href={notif.actionUrl || '/dashboard'}
                        onClick={() => setShowBell(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/70 transition-colors block"
                      >
                        <div className="mt-0.5">
                          {notif.type === 'EXAM_ALERT' ? (
                            <CalendarDays size={16} className={iconColor} />
                          ) : notif.type === 'LOW_PERFORMANCE' ? (
                            <AlertCircle size={16} className="text-amber-500" />
                          ) : notif.type === 'STUDY_ROOM' ? (
                            <Users size={16} className="text-cyan-400" />
                          ) : (
                            <Sparkles size={16} className="text-purple-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{notif.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-border px-4 py-2 bg-muted/20 flex justify-between">
                <Link
                  href="/exams"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setShowBell(false)}
                >
                  Exams →
                </Link>
                <Link
                  href="/study-together"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setShowBell(false)}
                >
                  Study Rooms →
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
            className="relative h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow: 'none',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 2px rgba(0,229,192,0.4), 0 0 0 4px rgba(0,229,192,0.12)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            aria-label="Profile menu"
          >
            {user?.photoUrl ? (
              <AvatarImage
                src={user.photoUrl}
                alt="Profile"
                fill
                className="object-cover"
                fallback={<span className="text-sm">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>}
              />
            ) : (
              <span className="text-sm">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            )}
          </button>

          {showAvatar && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-xl z-50 overflow-hidden"
              style={{
                background: 'hsl(var(--card) / 0.98)',
                backdropFilter: 'blur(16px) saturate(1.2)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
                border: '1px solid hsl(var(--border))',
                boxShadow: 'var(--app-elevation-4)',
              }}
            >
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

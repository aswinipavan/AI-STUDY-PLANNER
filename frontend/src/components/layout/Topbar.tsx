'use client';

import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import Image from 'next/image';
import { Menu, Moon, Sun, Bell } from 'lucide-react';

export function Topbar() {
  const { toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="mr-4 rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
        >
          <Menu size={20} />
          <span className="sr-only">Toggle Sidebar</span>
        </button>
      </div>

      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <button className="rounded-full p-2 text-muted-foreground hover:bg-muted">
          <Bell size={20} />
        </button>

        {/* Profile Avatar */}
        <div className="relative h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden cursor-pointer">
          {user?.photoUrl ? (
            <Image src={user.photoUrl} alt="Profile" fill className="object-cover" unoptimized />
          ) : (
            <span>{user?.name?.charAt(0) || 'U'}</span>
          )}
        </div>
      </div>
    </header>
  );
}

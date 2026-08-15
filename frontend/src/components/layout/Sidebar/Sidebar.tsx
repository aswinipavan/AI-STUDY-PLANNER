import React from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, LayoutDashboard, LineChart, MessageSquare, GraduationCap, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Subjects', href: '/subjects', icon: BookOpen },
  { label: 'Timetable', href: '/timetable', icon: Calendar },
  { label: 'AI Chat', href: '/chat', icon: MessageSquare },
  { label: 'Materials', href: '/materials', icon: FileText },
  { label: 'Exams', href: '/exams', icon: GraduationCap },
  { label: 'Analytics', href: '/analytics', icon: LineChart },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-card border-r flex flex-col sticky top-0 hidden md:flex">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            AI Planner
          </span>
        </Link>
      </div>
      
      <nav className="flex-1 px-4 overflow-y-auto py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors group"
            >
              <Icon className="h-5 w-5 group-hover:text-primary transition-colors" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center space-y-3">
          <div className="text-amber-500 font-semibold text-sm">Pro Features</div>
          <p className="text-xs text-muted-foreground">Unlock unlimited AI generations.</p>
          <Link href="/subscription">
            <Button variant="outline" className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600">
              Upgrade Now
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
};

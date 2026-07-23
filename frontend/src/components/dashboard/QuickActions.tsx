'use client';

import React from 'react';
import { PlusCircle, CalendarPlus, FileText, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function QuickActions() {
  const actions = [
    { title: 'Add Subject', icon: PlusCircle, href: '/subjects/new', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Gen Timetable', icon: CalendarPlus, href: '/timetable/generate', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Add Exam', icon: FileText, href: '/exams/new', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Start Chat', icon: MessageSquare, href: '/chat', color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action) => (
        <Link 
          key={action.title} 
          href={action.href}
          className="flex items-center p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all group"
        >
          <div className={`p-3 rounded-lg ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
            <action.icon className="w-5 h-5" />
          </div>
          <span className="ml-3 font-medium text-sm text-foreground">{action.title}</span>
        </Link>
      ))}
    </div>
  );
}

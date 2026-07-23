import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const TopNav = () => {
  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10 px-6 flex items-center justify-between">
      <div className="flex-1 max-w-md relative hidden sm:block">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="Search resources, exams..." 
          className="w-full pl-9 bg-secondary/30 border-none focus-visible:ring-1" 
        />
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        
        <div className="flex items-center gap-3 pl-4 border-l">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium leading-none">Aswin</span>
            <span className="text-xs text-muted-foreground mt-1">Student Plan</span>
          </div>
          <Button variant="secondary" size="icon" className="rounded-full">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

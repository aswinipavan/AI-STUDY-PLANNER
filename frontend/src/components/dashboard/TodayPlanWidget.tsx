'use client';

import React from 'react';
import { useActiveTimetable } from '@/hooks/useDashboard';
import { CheckCircle2, Circle } from 'lucide-react';

export default function TodayPlanWidget() {
  const { data: timetable } = useActiveTimetable();
  const slots = timetable?.slots || [];

  if (slots.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-bold text-card-foreground mb-2">Today&apos;s Study Plan</h3>
        <p className="text-muted-foreground text-sm">No study sessions scheduled for today. Take a break or generate a new timetable!</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col">
      <h3 className="text-lg font-bold text-card-foreground mb-6">Today&apos;s Study Plan</h3>
      
      <div className="flex-1 overflow-y-auto space-y-4">
        {slots.map((slot) => (
          <div key={slot.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50 hover:bg-muted transition-colors">
            <div className="flex items-center space-x-4">
              <button className="text-muted-foreground hover:text-primary transition-colors">
                {slot.status === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </button>
              <div>
                <p className="font-semibold text-foreground">{slot.subject?.name || 'Unknown Subject'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {slot.startTime} - {slot.endTime}
                </p>
              </div>
            </div>
            {slot.subject?.color && (
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: slot.subject.color }} 
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

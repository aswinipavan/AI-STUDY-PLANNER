'use client';

import React from 'react';
import { usePrioritySubjects } from '@/hooks/useDashboard';
import { TrendingDown, AlertTriangle } from 'lucide-react';

export default function PriorityWidget() {
  const { data: priorities } = usePrioritySubjects();

  // Assuming priorities is an array of SubjectPerformance
  const displayPriorities = Array.isArray(priorities) ? priorities.slice(0, 3) : [];

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-6">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="text-lg font-bold text-card-foreground">Priority Focus</h3>
      </div>

      {displayPriorities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">All subjects are on track!</p>
      ) : (
        <div className="space-y-4">
          {displayPriorities.map((item, index) => {
            const pct = Math.round(item.averagePercentage ?? (100 - item.priorityScore));
            return (
              <div key={item.id || index} className="flex flex-col">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-medium text-foreground">{item.subjectName}</span>
                  <span className="text-xs font-bold text-destructive flex items-center">
                    {pct}% <TrendingDown className="w-3 h-3 ml-1" />
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-destructive h-2 rounded-full" 
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React from 'react';

export function WidgetSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-pulse">
      <div className="h-6 bg-muted rounded w-1/3 mb-6"></div>
      <div className="space-y-4">
        <div className="h-16 bg-muted rounded-lg w-full"></div>
        <div className="h-16 bg-muted rounded-lg w-full"></div>
        <div className="h-16 bg-muted rounded-lg w-full"></div>
      </div>
    </div>
  );
}

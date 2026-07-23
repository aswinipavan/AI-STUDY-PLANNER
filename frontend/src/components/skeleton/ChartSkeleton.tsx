import React from 'react';

export function ChartSkeleton() {
  const bars = [60, 80, 45, 90, 55, 70, 40];
  return (
    <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
      <div className="h-5 bg-muted rounded w-1/3 mb-6" />
      <div className="flex items-end gap-2 h-40 mb-4">
        {/* Bar chart outline */}
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-muted rounded-t-md"
            style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
      <div className="flex items-center space-x-4 mt-4">
        <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
          <svg width="64" height="64" className="-rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" opacity="0.4" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" strokeDasharray="175" strokeDashoffset="44" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

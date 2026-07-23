import React from 'react';

export function TimetableGridSkeleton() {
  const days = 7;
  const rows = 4;
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      {/* Header row */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {Array.from({ length: days }).map((_, i) => (
          <div key={i} className="h-6 bg-muted rounded-md" />
        ))}
      </div>
      {/* Slot rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid grid-cols-7 gap-2 mb-2">
          {Array.from({ length: days }).map((_, c) => (
            <div
              key={c}
              className="h-16 bg-muted rounded-lg"
              style={{ animationDelay: `${(r * days + c) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

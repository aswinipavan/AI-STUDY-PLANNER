import React from 'react';

interface Props {
  count?: number;
}

export function MaterialsListSkeleton({ count = 6 }: Props) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center space-x-4 p-4 bg-card border border-border rounded-xl"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Icon block */}
          <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
          {/* Text blocks */}
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

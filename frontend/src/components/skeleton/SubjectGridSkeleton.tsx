import React from 'react';

interface Props {
  count?: number;
}

export function SubjectGridSkeleton({ count = 6 }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[90px] w-full rounded-xl bg-muted animate-pulse"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

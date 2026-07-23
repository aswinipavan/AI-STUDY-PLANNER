'use client';

import React from 'react';

interface ScoreBadgeProps {
  score: number;
  maxScore: number;
  size?: 'sm' | 'md';
}

export function ScoreBadge({ score, maxScore, size = 'md' }: ScoreBadgeProps) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const colorClass =
    pct >= 75 ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30' :
    pct >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' :
    'bg-destructive/10 text-destructive border-destructive/30';

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center font-bold rounded-full border ${colorClass} ${sizeClass}`}>
      {pct}%
    </span>
  );
}

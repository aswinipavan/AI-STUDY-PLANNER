import React from 'react';

export function ChatHistorySkeleton() {
  // Alternating left/right bubble shapes
  const items = [false, true, false, false, true, false, true];
  return (
    <div className="space-y-5 p-4 animate-pulse">
      {items.map((isRight, i) => (
        <div key={i} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`h-12 rounded-2xl bg-muted ${isRight ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
            style={{
              width: `${40 + ((i * 17) % 30)}%`,
              animationDelay: `${i * 80}ms`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

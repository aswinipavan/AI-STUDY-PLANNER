import confetti from 'canvas-confetti';

/**
 * Fires a celebratory burst of confetti across the screen
 * for milestones, completing all daily sessions, or exam countdown triumphs.
 */
export function fireCelebrationConfetti() {
  if (typeof window === 'undefined') return;

  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#06b6d4', '#3b82f6', '#10b981'],
  });

  fire(0.2, {
    spread: 60,
    colors: ['#8b5cf6', '#ec4899', '#f59e0b'],
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

/**
 * Fires a smaller localized celebratory burst from a specific button click
 */
export function fireBadgeConfetti(x = 0.5, y = 0.5) {
  if (typeof window === 'undefined') return;
  confetti({
    particleCount: 50,
    spread: 70,
    origin: { x, y },
    zIndex: 9999,
    colors: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b'],
  });
}

'use client';

import React, { useEffect, useRef, memo } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  delay: number;
  type: 'paper' | 'dust' | 'glow';
}

function generateParticles(): Particle[] {
  const particles: Particle[] = [];

  // Floating paper sheets
  for (let i = 0; i < 7; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 120 - 20,
      size: 28 + Math.random() * 52,
      speed: 18 + Math.random() * 22,
      drift: (Math.random() - 0.5) * 30,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
      opacity: 0.04 + Math.random() * 0.06,
      delay: Math.random() * -30,
      type: 'paper',
    });
  }

  // Tiny dust motes
  for (let i = 7; i < 22; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 120 - 20,
      size: 2 + Math.random() * 4,
      speed: 25 + Math.random() * 35,
      drift: (Math.random() - 0.5) * 18,
      rotation: 0,
      rotationSpeed: 0,
      opacity: 0.15 + Math.random() * 0.25,
      delay: Math.random() * -40,
      type: 'dust',
    });
  }

  // Soft glow blobs
  for (let i = 22; i < 26; i++) {
    particles.push({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      size: 200 + Math.random() * 300,
      speed: 0,
      drift: 0,
      rotation: 0,
      rotationSpeed: 0,
      opacity: 0.035 + Math.random() * 0.025,
      delay: Math.random() * -15,
      type: 'glow',
    });
  }

  return particles;
}

const PARTICLES = generateParticles();

export const OnboardingBackground = memo(function OnboardingBackground() {
  const glowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Slow pulsing for glow blobs
    const intervals: ReturnType<typeof setInterval>[] = [];
    glowRefs.current.forEach((el, i) => {
      if (!el) return;
      let phase = Math.random() * Math.PI * 2;
      const baseOpacity = PARTICLES.filter(p => p.type === 'glow')[i]?.opacity ?? 0.04;
      const interval = setInterval(() => {
        phase += 0.012;
        if (el) {
          el.style.opacity = String(baseOpacity + Math.sin(phase) * 0.018);
        }
      }, 60);
      intervals.push(interval);
    });
    return () => intervals.forEach(clearInterval);
  }, []);

  const papers = PARTICLES.filter(p => p.type === 'paper');
  const dusts = PARTICLES.filter(p => p.type === 'dust');
  const glows = PARTICLES.filter(p => p.type === 'glow');

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Warm radial gradient base */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 30%, hsl(38 40% 94%) 0%, hsl(210 30% 92%) 55%, hsl(220 25% 88%) 100%)',
      }} />

      {/* Soft light rays */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '140%',
        height: '70%',
        background: 'conic-gradient(from 260deg at 50% 0%, transparent 0%, hsl(45 80% 96% / 0.18) 8%, transparent 16%, hsl(210 60% 96% / 0.12) 24%, transparent 32%)',
        filter: 'blur(8px)',
      }} />

      {/* Glow blobs */}
      {glows.map((p, i) => (
        <div
          key={p.id}
          ref={el => { glowRefs.current[i] = el; }}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: i % 2 === 0
              ? 'radial-gradient(circle, hsl(170 60% 70%) 0%, transparent 70%)'
              : 'radial-gradient(circle, hsl(38 80% 80%) 0%, transparent 70%)',
            opacity: p.opacity,
            filter: 'blur(30px)',
            willChange: 'opacity',
          }}
        />
      ))}

      {/* Floating paper sheets */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(110vh) rotate(var(--rot-start)) translateX(0); opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { transform: translateY(-15vh) rotate(var(--rot-end)) translateX(var(--drift)); opacity: 0; }
        }
        @keyframes dustFloat {
          0% { transform: translateY(110vh) translateX(0); opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { transform: translateY(-10vh) translateX(var(--drift)); opacity: 0; }
        }
      `}</style>

      {papers.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            bottom: '-10%',
            width: p.size,
            height: p.size * 1.3,
            '--rot-start': `${p.rotation}deg`,
            '--rot-end': `${p.rotation + p.rotationSpeed * p.speed}deg`,
            '--drift': `${p.drift}px`,
            background: 'linear-gradient(135deg, hsl(40 30% 97%) 0%, hsl(38 20% 92%) 100%)',
            borderRadius: '2px',
            boxShadow: '0 1px 6px hsl(30 20% 70% / 0.15)',
            opacity: 0,
            animation: `floatUp ${p.speed}s linear ${p.delay}s infinite`,
            willChange: 'transform, opacity',
          } as React.CSSProperties}
        />
      ))}

      {/* Dust motes */}
      {dusts.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            bottom: '-5%',
            width: p.size,
            height: p.size,
            '--drift': `${p.drift}px`,
            borderRadius: '50%',
            background: p.id % 3 === 0
              ? 'hsl(170 50% 55%)'
              : p.id % 3 === 1
                ? 'hsl(38 60% 65%)'
                : 'hsl(220 40% 70%)',
            opacity: 0,
            animation: `dustFloat ${p.speed}s ease-in-out ${p.delay}s infinite`,
            willChange: 'transform, opacity',
          } as React.CSSProperties}
        />
      ))}

      {/* Subtle paper grain texture */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.025 }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
});

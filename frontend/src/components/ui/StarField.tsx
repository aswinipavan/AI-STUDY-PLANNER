'use client';

import React, { useEffect, useRef } from 'react';

interface StarFieldProps {
  className?: string;
  starCount?: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  hasGlow: boolean;
}

export function StarField({ className, starCount }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const stars: Star[] = [];
    const colors = [
      '255, 255, 255', // Pure crisp white
      '225, 242, 255', // Ice cyan-white
      '185, 220, 255', // Celestial nebula blue
      '255, 248, 230', // Subtle warm star
    ];

    function initStars() {
      stars.length = 0;
      const targetCount = starCount ?? Math.floor((width * height) / 3800);
      const count = Math.max(220, Math.min(targetCount, 550));

      for (let i = 0; i < count; i++) {
        const isSmall = Math.random() < 0.82;
        const radius = isSmall
          ? Math.random() * 0.8 + 0.4
          : Math.random() * 1.0 + 1.2;

        const hasGlow = !isSmall && Math.random() < 0.55;
        const color = colors[Math.floor(Math.random() * colors.length)];

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          baseAlpha: Math.random() * 0.55 + 0.35,
          twinkleSpeed: Math.random() * 0.0016 + 0.0007,
          twinklePhase: Math.random() * Math.PI * 2,
          color,
          hasGlow,
        });
      }
    }

    initStars();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
      if (prefersReducedMotion) {
        draw(0);
      }
    };

    window.addEventListener('resize', handleResize);

    function draw(time: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        let alpha = s.baseAlpha;
        if (!prefersReducedMotion) {
          alpha = s.baseAlpha * (0.65 + 0.35 * Math.sin(time * s.twinkleSpeed + s.twinklePhase));
        }

        ctx.fillStyle = `rgba(${s.color}, ${alpha})`;

        if (s.hasGlow) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = `rgba(${s.color}, ${alpha * 0.85})`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (prefersReducedMotion) {
      draw(0);
    } else {
      let lastTime = 0;
      const animate = (time: number) => {
        if (time - lastTime > 26) {
          lastTime = time;
          draw(time);
        }
        animationFrameId = requestAnimationFrame(animate);
      };
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [starCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

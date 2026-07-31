'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { textVariants } from '../animationConfig';


export function Page1Welcome() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 280 * dpr;
    canvas.height = 220 * dpr;
    canvas.style.width = '280px';
    canvas.style.height = '220px';
    ctx.scale(dpr, dpr);

    // Soft particle dots
    const dots = Array.from({ length: 28 }, () => ({
      x: Math.random() * 280,
      y: Math.random() * 220,
      r: 1 + Math.random() * 2.5,
      alpha: 0.12 + Math.random() * 0.22,
      dx: (Math.random() - 0.5) * 0.25,
      dy: (Math.random() - 0.5) * 0.25,
      hue: Math.random() > 0.5 ? 170 : 38,
    }));

    let raf: number;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, 280, 220);
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${d.hue}, 55%, 58%, ${d.alpha})`;
        ctx.fill();
        d.x += d.dx;
        d.y += d.dy;
        if (d.x < 0 || d.x > 280) d.dx *= -1;
        if (d.y < 0 || d.y > 220) d.dy *= -1;
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem',
      padding: '1rem 0',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Illustration */}
      <div style={{ position: 'relative', width: 280, height: 220 }}>
        {/* Canvas particles layer */}
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Open notebook illustration */}
        <motion.div
          animate={{ y: [-6, 6, -6], rotate: [-2, 2, -2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', left: 20, top: 30, zIndex: 2 }}
        >
          <svg width="200" height="150" viewBox="0 0 200 150" fill="none" aria-label="Open notebook">
            {/* Book shadow */}
            <ellipse cx="100" cy="144" rx="88" ry="6" fill="hsl(30 20% 70% / 0.18)" />
            {/* Left page */}
            <rect x="8" y="12" width="90" height="128" rx="3" fill="hsl(38 25% 97%)" stroke="hsl(30 20% 82%)" strokeWidth="1" />
            {/* Left page lines */}
            {[30, 44, 58, 72, 86, 100, 114].map((y, i) => (
              <line key={i} x1="18" y1={y} x2="90" y2={y} stroke="hsl(220 20% 88%)" strokeWidth="0.8" />
            ))}
            {/* Right page */}
            <rect x="102" y="12" width="90" height="128" rx="3" fill="hsl(40 20% 98%)" stroke="hsl(30 20% 82%)" strokeWidth="1" />
            {/* Right page lines */}
            {[30, 44, 58, 72, 86, 100, 114].map((y, i) => (
              <line key={i} x1="112" y1={y} x2="184" y2={y} stroke="hsl(220 20% 88%)" strokeWidth="0.8" />
            ))}
            {/* Spine */}
            <rect x="94" y="10" width="12" height="132" rx="2" fill="hsl(220 25% 30%)" />
            <line x1="100" y1="10" x2="100" y2="142" stroke="hsl(220 25% 40%)" strokeWidth="0.5" />
            {/* Handwriting scribbles on left */}
            <path d="M 20 44 Q 35 40 55 44 Q 70 48 80 44" stroke="hsl(220 40% 55% / 0.35)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M 20 58 Q 40 54 60 58 Q 72 62 83 58" stroke="hsl(220 40% 55% / 0.28)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            {/* Bookmark ribbon */}
            <rect x="162" y="8" width="8" height="32" fill="hsl(170 65% 45%)" />
            <path d="M 162 40 L 166 36 L 170 40" fill="hsl(170 65% 45%)" />
          </svg>
        </motion.div>

        {/* Floating pencil */}
        <motion.div
          animate={{ y: [-8, 4, -8], rotate: [12, 16, 12] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          style={{ position: 'absolute', right: 18, top: 15, zIndex: 3 }}
        >
          <svg width="28" height="110" viewBox="0 0 28 110" fill="none" aria-label="Pencil">
            {/* Body */}
            <rect x="9" y="18" width="10" height="74" fill="hsl(38 80% 68%)" />
            {/* Stripe */}
            <rect x="9" y="18" width="10" height="6" fill="hsl(38 60% 56%)" />
            {/* Eraser end */}
            <rect x="9" y="10" width="10" height="10" rx="2" fill="hsl(350 60% 80%)" />
            {/* Metal band */}
            <rect x="8" y="88" width="12" height="5" fill="hsl(220 10% 68%)" />
            {/* Tip */}
            <path d="M 9 93 L 14 110 L 19 93 Z" fill="hsl(30 30% 72%)" />
            <path d="M 12 100 L 14 110 L 16 100 Z" fill="hsl(220 40% 22%)" />
          </svg>
        </motion.div>
      </div>

      {/* Text content */}
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <motion.div custom={0} variants={textVariants} initial="hidden" animate="visible">
          <div style={{
            display: 'inline-block',
            background: 'hsl(170 60% 45% / 0.1)',
            border: '1px solid hsl(170 60% 45% / 0.25)',
            borderRadius: '100px',
            padding: '4px 16px',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'hsl(170 55% 38%)',
            marginBottom: '1rem',
          }}>
            Your Study Companion
          </div>
        </motion.div>

        <motion.h1
          custom={1}
          variants={textVariants}
          initial="hidden"
          animate="visible"
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: 'clamp(2rem, 5vw, 2.9rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            color: 'hsl(220 35% 14%)',
            margin: '0 0 1rem 0',
            letterSpacing: '-0.02em',
          }}
        >
          Welcome to{' '}
          <span style={{ color: 'hsl(170 65% 38%)' }}>
            AI Study Planner
          </span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={textVariants}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
            color: 'hsl(220 20% 42%)',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Your personal AI-powered academic companion — designed to help you
          study smarter, plan better, and achieve more.
        </motion.p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { textVariants } from '../animationConfig';

interface RingProps {
  radius: number;
  strokeWidth: number;
  progress: number;
  color: string;
  delay: number;
  label: string;
  value: string;
}

function AnimatedRing({ radius, strokeWidth, progress, color, delay, label, value }: RingProps) {
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * progress;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={(radius + strokeWidth) * 2} height={(radius + strokeWidth) * 2} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="hsl(220 20% 90%)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ delay, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        textAlign: 'center',
        transform: 'rotate(0deg)',
      }}>
        <div style={{ fontSize: radius * 0.55, fontWeight: 700, color: 'hsl(220 35% 15%)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: radius * 0.28, color: 'hsl(220 20% 52%)', lineHeight: 1.2, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

const streakDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const streakActive = [true, true, true, true, false, false, false];

export function Page4Progress() {
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
      <motion.div
        animate={{ y: [-4, 4, -4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
      >
        {/* Progress rings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AnimatedRing radius={52} strokeWidth={8} progress={0.82} color="hsl(170 65% 42%)" delay={0.3} label="Readiness" value="82%" />
          <AnimatedRing radius={36} strokeWidth={7} progress={0.67} color="hsl(38 80% 55%)" delay={0.5} label="Progress" value="67%" />
          <AnimatedRing radius={26} strokeWidth={6} progress={0.91} color="hsl(280 60% 55%)" delay={0.7} label="Streak" value="91%" />
        </div>

        {/* Weekly streak */}
        <div style={{
          background: 'hsl(0 0% 100%)',
          borderRadius: 12,
          padding: '10px 16px',
          boxShadow: '0 4px 20px hsl(220 20% 60% / 0.1)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(220 25% 40%)', marginRight: 4 }}>🔥</span>
          {streakDays.map((day, i) => (
            <motion.div
              key={day}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: streakActive[i] ? 'hsl(38 85% 55%)' : 'hsl(220 20% 93%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: streakActive[i] ? '0 2px 8px hsl(38 70% 50% / 0.4)' : 'none',
              }}>
                {streakActive[i] && <span style={{ fontSize: 10 }}>✓</span>}
              </div>
              <span style={{ fontSize: 7.5, color: 'hsl(220 20% 55%)', fontWeight: 500 }}>{day}</span>
            </motion.div>
          ))}
        </div>

        {/* Achievement badges */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { icon: '⭐', label: '7-Day Streak', color: 'hsl(38 80% 55%)' },
            { icon: '🎯', label: 'Goal Crusher', color: 'hsl(170 65% 42%)' },
            { icon: '📚', label: '50h Studied', color: 'hsl(280 60% 55%)' },
          ].map((badge, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + i * 0.1, type: 'spring', stiffness: 250, damping: 22 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'hsl(0 0% 100%)',
                borderRadius: 100,
                padding: '4px 10px',
                boxShadow: '0 2px 10px hsl(220 20% 60% / 0.1)',
                border: `1px solid ${badge.color}30`,
              }}
            >
              <span style={{ fontSize: 11 }}>{badge.icon}</span>
              <span style={{ fontSize: 8.5, fontWeight: 600, color: 'hsl(220 25% 35%)' }}>{badge.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Text */}
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <motion.div custom={0} variants={textVariants} initial="hidden" animate="visible">
          <div style={{
            display: 'inline-block',
            background: 'hsl(38 80% 55% / 0.1)',
            border: '1px solid hsl(38 80% 55% / 0.25)',
            borderRadius: '100px',
            padding: '4px 16px',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'hsl(38 70% 40%)',
            marginBottom: '1rem',
          }}>
            Track Progress
          </div>
        </motion.div>

        <motion.h2
          custom={1}
          variants={textVariants}
          initial="hidden"
          animate="visible"
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: 'clamp(1.8rem, 4.5vw, 2.6rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'hsl(220 35% 14%)',
            margin: '0 0 1rem 0',
            letterSpacing: '-0.02em',
          }}
        >
          Every Study Session{' '}
          <span style={{ color: 'hsl(38 75% 42%)' }}>Matters</span>
        </motion.h2>

        <motion.p
          custom={2}
          variants={textVariants}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: 'clamp(0.95rem, 2.2vw, 1.1rem)',
            color: 'hsl(220 20% 42%)',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Monitor streaks, productivity, readiness scores, and academic growth
          — beautiful insights that keep you motivated and on track.
        </motion.p>
      </div>
    </div>
  );
}

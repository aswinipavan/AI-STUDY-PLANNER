'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { textVariants } from '../animationConfig';

const goals = [
  { icon: '🌱', text: 'Build better habits', color: 'hsl(145 60% 42%)' },
  { icon: '📅', text: 'Study consistently', color: 'hsl(220 65% 50%)' },
  { icon: '🏆', text: 'Achieve your goals', color: 'hsl(38 80% 52%)' },
];

interface PageProps {
  onStart: () => void;
}

export function Page5Start({ onStart }: PageProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2.2rem',
      padding: '1rem 0',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Hero illustration — glowing star / compass */}
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', top: '-10%', right: '-5%', opacity: 0.06, pointerEvents: 'none' }}
      >
        <svg width="280" height="280" viewBox="0 0 280 280">
          <circle cx="140" cy="140" r="130" stroke="hsl(170 65% 42%)" strokeWidth="0.5" fill="none" strokeDasharray="4 8" />
          <circle cx="140" cy="140" r="80" stroke="hsl(220 40% 55%)" strokeWidth="0.5" fill="none" strokeDasharray="3 6" />
          <circle cx="140" cy="140" r="40" stroke="hsl(38 80% 55%)" strokeWidth="0.5" fill="none" />
        </svg>
      </motion.div>

      {/* Central medallion */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 18 }}
        style={{ position: 'relative' }}
      >
        {/* Outer glow */}
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.92, 1.08, 0.92] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: -20,
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(170 70% 55% / 0.25) 0%, transparent 70%)',
            filter: 'blur(8px)',
          }}
        />
        <div style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, hsl(220 35% 18%) 0%, hsl(170 65% 30%) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 40px hsl(170 65% 40% / 0.3), 0 2px 8px hsl(220 35% 18% / 0.2)',
          position: 'relative',
          zIndex: 1,
        }}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            {/* Compass / star icon */}
            <path d="M26 4 L30 20 L46 26 L30 32 L26 48 L22 32 L6 26 L22 20 Z" fill="hsl(38 80% 72%)" stroke="hsl(38 60% 60%)" strokeWidth="0.5" />
            <circle cx="26" cy="26" r="5" fill="white" opacity="0.9" />
          </svg>
        </div>
      </motion.div>

      {/* Goal list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360 }}>
        {goals.map((g, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'hsl(0 0% 100% / 0.7)',
              backdropFilter: 'blur(12px)',
              borderRadius: 12,
              padding: '10px 16px',
              boxShadow: '0 2px 12px hsl(220 20% 60% / 0.08)',
              border: `1px solid ${g.color}22`,
            }}
          >
            <span style={{ fontSize: 20 }}>{g.icon}</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'hsl(220 30% 22%)' }}>{g.text}</span>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + i * 0.15, type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                marginLeft: 'auto',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: g.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 5.5 L4 7.5 L8 3" />
              </svg>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <motion.h2
          custom={0}
          variants={textVariants}
          initial="hidden"
          animate="visible"
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: 'clamp(1.8rem, 4.5vw, 2.6rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'hsl(220 35% 14%)',
            margin: '0 0 0.8rem 0',
            letterSpacing: '-0.02em',
          }}
        >
          Your Journey{' '}
          <span style={{
            background: 'linear-gradient(135deg, hsl(170 65% 38%), hsl(220 65% 50%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Starts Here
          </span>
        </motion.h2>

        {/* Main CTA */}
        <motion.div
          custom={1}
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.button
            id="onboarding-start-learning"
            onClick={onStart}
            whileHover={{ scale: 1.03, boxShadow: '0 10px 40px hsl(170 65% 40% / 0.45)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop: '0.5rem',
              padding: '14px 48px',
              fontSize: '1.08rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              background: 'linear-gradient(135deg, hsl(170 65% 38%) 0%, hsl(170 55% 30%) 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '100px',
              cursor: 'pointer',
              boxShadow: '0 6px 28px hsl(170 65% 40% / 0.32)',
              transition: 'box-shadow 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shimmer effect */}
            <motion.span
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.18) 50%, transparent 100%)',
              }}
            />
            Start Learning ✦
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { textVariants } from '../animationConfig';


const tasks = [
  { label: 'Mathematics — Chapter 5', done: true, color: 'hsl(170 65% 42%)' },
  { label: 'Physics — Wave Optics', done: true, color: 'hsl(170 65% 42%)' },
  { label: 'Chemistry — Organic', done: false, color: 'hsl(220 25% 72%)' },
  { label: 'Biology — Genetics', done: false, color: 'hsl(220 25% 72%)' },
];

function AIGlow() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5], scale: [0.97, 1.03, 0.97] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: 'radial-gradient(circle, hsl(170 80% 55%) 0%, hsl(170 60% 38%) 60%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 18px hsl(170 70% 50% / 0.6)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M12 2L9 9H2L7.5 13.5L5.5 21L12 17L18.5 21L16.5 13.5L22 9H15L12 2Z" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}

export function Page2Planning() {
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
      {/* Illustration: Calendar + Task cards */}
      <motion.div
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', width: 300, height: 210 }}
      >
        {/* Calendar */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 10,
          width: 160,
          height: 150,
          background: 'hsl(0 0% 100%)',
          borderRadius: 12,
          boxShadow: '0 4px 24px hsl(220 20% 60% / 0.14)',
          overflow: 'hidden',
        }}>
          {/* Calendar header */}
          <div style={{
            background: 'hsl(220 35% 18%)',
            padding: '8px 12px',
            color: 'white',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}>
            JULY 2026
          </div>
          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, padding: '6px' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} style={{ fontSize: 7.5, fontWeight: 600, color: 'hsl(220 20% 55%)', textAlign: 'center', padding: '2px 0' }}>{d}</div>
            ))}
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
              const isHighlight = [8, 15, 22, 23].includes(day);
              const isToday = day === 30;
              return (
                <div key={day} style={{
                  fontSize: 8,
                  textAlign: 'center',
                  padding: '2.5px 0',
                  borderRadius: 3,
                  background: isHighlight ? 'hsl(170 65% 42%)' : isToday ? 'hsl(220 35% 18%)' : 'transparent',
                  color: isHighlight || isToday ? 'white' : 'hsl(220 25% 30%)',
                  fontWeight: isHighlight || isToday ? 700 : 400,
                }}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Task cards stack */}
        <div style={{ position: 'absolute', right: 0, top: 0 }}>
          {tasks.map((task, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: 130,
                marginBottom: 6,
                padding: '6px 10px',
                background: 'hsl(0 0% 100%)',
                borderRadius: 8,
                boxShadow: '0 2px 10px hsl(220 20% 60% / 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: task.done ? task.color : 'transparent',
                border: `2px solid ${task.color}`,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 9.5, color: task.done ? 'hsl(220 20% 42%)' : 'hsl(220 25% 30%)', fontWeight: task.done ? 400 : 600, textDecoration: task.done ? 'line-through' : 'none' }}>
                {task.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* AI glow indicator */}
        <div style={{ position: 'absolute', left: 0, bottom: 0 }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'hsl(170 60% 45% / 0.08)', border: '1px solid hsl(170 60% 45% / 0.2)', borderRadius: 100, padding: '4px 10px' }}>
            <AIGlow />
            <span style={{ fontSize: 9, color: 'hsl(170 55% 35%)', fontWeight: 600, paddingRight: 30 }}>AI is building your plan…</span>
          </div>
        </div>
      </motion.div>

      {/* Text */}
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <motion.div custom={0} variants={textVariants} initial="hidden" animate="visible">
          <div style={{
            display: 'inline-block',
            background: 'hsl(220 60% 50% / 0.08)',
            border: '1px solid hsl(220 60% 50% / 0.2)',
            borderRadius: '100px',
            padding: '4px 16px',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'hsl(220 55% 45%)',
            marginBottom: '1rem',
          }}>
            Smart Planning
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
          Plan{' '}
          <span style={{ color: 'hsl(220 65% 45%)' }}>Smarter</span>
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
          AI analyzes your subjects, exams, and progress to build personalized
          study plans — adapted to your pace, every single day.
        </motion.p>
      </div>
    </div>
  );
}

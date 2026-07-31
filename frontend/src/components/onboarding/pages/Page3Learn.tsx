'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { textVariants } from '../animationConfig';

const neurons = [
  { cx: 140, cy: 55, r: 14 },
  { cx: 100, cy: 88, r: 10 },
  { cx: 178, cy: 88, r: 10 },
  { cx: 80, cy: 128, r: 8 },
  { cx: 124, cy: 120, r: 8 },
  { cx: 162, cy: 128, r: 8 },
  { cx: 200, cy: 120, r: 7 },
];

const synapses = [
  [0, 1], [0, 2], [1, 2], [1, 3], [1, 4], [2, 4], [2, 5], [2, 6], [3, 4], [4, 5], [5, 6],
];

const bubbles = [
  { text: '¿What is photosynthesis?', x: 0, y: 0, delay: 0.4 },
  { text: 'Summarize Chapter 4', x: 0, y: 0, delay: 0.8 },
  { text: 'Quiz me on Algebra', x: 0, y: 0, delay: 1.2 },
];

export function Page3Learn() {
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
      <div style={{ position: 'relative', width: 310, height: 230 }}>

        {/* Brain / neural connections */}
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', right: 10, top: 0 }}
        >
          <svg width="230" height="165" viewBox="0 0 230 165" fill="none" aria-label="Neural network">
            {/* Synapse lines */}
            {synapses.map(([a, b], i) => {
              const na = neurons[a], nb = neurons[b];
              return (
                <motion.line
                  key={i}
                  x1={na.cx} y1={na.cy} x2={nb.cx} y2={nb.cy}
                  stroke="hsl(170 60% 55%)"
                  strokeWidth="1"
                  strokeOpacity={0.3}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1, strokeOpacity: [0.15, 0.4, 0.15] }}
                  transition={{ delay: i * 0.08, duration: 1.2 + i * 0.1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                />
              );
            })}
            {/* Neuron nodes */}
            {neurons.map((n, i) => (
              <motion.circle
                key={i}
                cx={n.cx} cy={n.cy} r={n.r}
                fill={i === 0 ? 'hsl(170 65% 42%)' : 'hsl(220 30% 92%)'}
                stroke={i === 0 ? 'hsl(170 65% 35%)' : 'hsl(220 30% 75%)'}
                strokeWidth="1.5"
                animate={{ scale: i === 0 ? [1, 1.15, 1] : [1, 1.06, 1] }}
                transition={{ delay: i * 0.2, duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
            {/* Center brain icon */}
            <text x={140} y={60} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="white" fontWeight="bold">AI</text>
          </svg>
        </motion.div>

        {/* Chat bubbles */}
        <div style={{ position: 'absolute', left: 0, top: 20 }}>
          {bubbles.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -18, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: b.delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{
                marginBottom: 8,
                padding: '6px 12px',
                background: i % 2 === 0 ? 'hsl(220 35% 18%)' : 'hsl(170 60% 45% / 0.12)',
                color: i % 2 === 0 ? 'white' : 'hsl(170 55% 32%)',
                borderRadius: i % 2 === 0 ? '10px 10px 10px 2px' : '10px 10px 2px 10px',
                fontSize: 9.5,
                fontWeight: 500,
                maxWidth: 130,
                border: i % 2 === 0 ? 'none' : '1px solid hsl(170 60% 45% / 0.25)',
              }}
            >
              {b.text}
            </motion.div>
          ))}
        </div>

        {/* Floating book */}
        <motion.div
          animate={{ y: [0, -7, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          style={{ position: 'absolute', left: 30, bottom: 10 }}
        >
          <svg width="44" height="58" viewBox="0 0 44 58" fill="none" aria-label="Book">
            <rect x="2" y="2" width="40" height="54" rx="3" fill="hsl(220 35% 20%)" />
            <rect x="2" y="2" width="6" height="54" rx="3" fill="hsl(220 30% 32%)" />
            <rect x="10" y="10" width="26" height="2" rx="1" fill="hsl(210 40% 75% / 0.5)" />
            <rect x="10" y="16" width="20" height="1.5" rx="1" fill="hsl(210 40% 75% / 0.3)" />
            <rect x="10" y="21" width="22" height="1.5" rx="1" fill="hsl(210 40% 75% / 0.3)" />
          </svg>
        </motion.div>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <motion.div custom={0} variants={textVariants} initial="hidden" animate="visible">
          <div style={{
            display: 'inline-block',
            background: 'hsl(280 60% 55% / 0.08)',
            border: '1px solid hsl(280 60% 55% / 0.22)',
            borderRadius: '100px',
            padding: '4px 16px',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'hsl(280 55% 48%)',
            marginBottom: '1rem',
          }}>
            AI-Powered Learning
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
          Learn with{' '}
          <span style={{ color: 'hsl(280 60% 48%)' }}>AI</span>
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
          Ask questions, summarize notes, generate quizzes, and understand any
          concept instantly — with an AI tutor that never sleeps.
        </motion.p>
      </div>
    </div>
  );
}

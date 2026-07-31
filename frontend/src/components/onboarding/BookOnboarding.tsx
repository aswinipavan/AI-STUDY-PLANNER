'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useRouter } from 'next/navigation';
import styles from './BookOnboarding.module.css';
import { OnboardingBackground } from './OnboardingBackground';
import { Page1Welcome } from './pages/Page1Welcome';
import { Page2Planning } from './pages/Page2Planning';
import { Page3Learn } from './pages/Page3Learn';
import { Page4Progress } from './pages/Page4Progress';
import { Page5Start } from './pages/Page5Start';
import { EASE_OUT, EASE_IN } from './animationConfig';

/* ================================================================
   ARCHITECTURE — Realistic Book Page Turn

   How a real book page turns:
   - The page HINGES at the spine (left edge for forward, right for backward)
   - The front face is visible as the page lifts
   - The back (paper texture) becomes visible mid-turn
   - The NEXT page is already visible BENEATH the turning page
   - A shadow falls on the next page as the old page sweeps over it

   Implementation:
   1. BASE LAYER   – the destination page, always rendered underneath
   2. FLIP LAYER   – the source page, rotates around its edge (spine)
      ├─ Front face  – source page content (backface-visibility: hidden)
      └─ Back face   – paper texture    (backface-visibility: hidden)
   3. SHADOW       – darkens base page during the sweep

   KEY: transform-origin is at the EDGE (left 50% or right 50%)
        NOT at center center — that is what caused the "spinning card" look
   ================================================================ */

const TOTAL_PAGES = 5;
const FLIP_MS     = 760;  // ms — animation duration

const PAGE_LABELS = [
  'Introduction',
  'Smart Planning',
  'AI Learning',
  'Progress',
  'Get Started',
];

/* ── Overlay fade in/out ─────────────────────────────────────── */
const overlayVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.45, ease: EASE_OUT } },
  exit:    { opacity: 0, transition: { duration: 0.4,  ease: EASE_IN  } },
};

/* ── State type ─────────────────────────────────────────────── */
interface FlipState {
  fromPage:  number;
  toPage:    number;
  direction: 'forward' | 'backward';
}

interface Props {
  onComplete: () => void;
  onSkip:     () => void;
}

/* ── Page content renderer ──────────────────────────────────── */
function renderPage(idx: number, onStart: () => void): React.ReactNode {
  switch (idx) {
    case 0: return <Page1Welcome />;
    case 1: return <Page2Planning />;
    case 2: return <Page3Learn />;
    case 3: return <Page4Progress />;
    case 4: return <Page5Start onStart={onStart} />;
    default: return null;
  }
}

export function BookOnboarding({ onComplete, onSkip }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [flip, setFlip]               = useState<FlipState | null>(null);
  const router = useRouter();

  const isAnimating = flip !== null;

  /* Detect reduced-motion preference (server-safe) */
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Trigger a page flip ────────────────────────────────── */
  const triggerFlip = useCallback(
    (from: number, to: number, dir: 'forward' | 'backward') => {
      if (isAnimating) return;
      setFlip({ fromPage: from, toPage: to, direction: dir });
      setTimeout(() => {
        setCurrentPage(to);
        setFlip(null);
      }, FLIP_MS);
    },
    [isAnimating],
  );

  const goForward = useCallback(() => {
    if (currentPage >= TOTAL_PAGES - 1 || isAnimating) return;
    triggerFlip(currentPage, currentPage + 1, 'forward');
  }, [currentPage, isAnimating, triggerFlip]);

  const goBackward = useCallback(() => {
    if (currentPage <= 0 || isAnimating) return;
    triggerFlip(currentPage, currentPage - 1, 'backward');
  }, [currentPage, isAnimating, triggerFlip]);

  const handleStart = useCallback(() => {
    onComplete();
    router.push('/dashboard');
  }, [onComplete, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentPage < TOTAL_PAGES - 1) goForward();
        else handleStart();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        goBackward();
        break;
      case 'Escape':
        onSkip();
        break;
    }
  }, [currentPage, goForward, goBackward, handleStart, onSkip]);

  /* ── During flip, "base" = destination page (always beneath) ── */
  const basePage   = flip ? flip.toPage   : currentPage;
  const isLastPage = currentPage === TOTAL_PAGES - 1;
  const isFirstPage = currentPage === 0;

  /* ── Shared navigation controls ─────────────────────────── */
  const controls = (
    <div className={styles.controls} aria-label="Onboarding navigation">
      {!isFirstPage && (
        <motion.button
          className={styles.btnBack}
          onClick={goBackward}
          disabled={isAnimating}
          id="onboarding-back"
          aria-label="Go to previous page"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Back
        </motion.button>
      )}

      <div
        className={styles.progressDots}
        role="tablist"
        aria-label={`Page ${currentPage + 1} of ${TOTAL_PAGES}`}
      >
        {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === currentPage}
            aria-label={`Go to ${PAGE_LABELS[i]}`}
            className={`${styles.dot} ${i === currentPage ? styles.dotActive : ''}`}
            onClick={() => {
              if (isAnimating || i === currentPage) return;
              triggerFlip(currentPage, i, i > currentPage ? 'forward' : 'backward');
            }}
          />
        ))}
      </div>

      {!isLastPage && (
        <motion.button
          className={styles.btnContinue}
          onClick={goForward}
          disabled={isAnimating}
          id="onboarding-continue"
          aria-label="Continue to next page"
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
        >
          Continue →
        </motion.button>
      )}
    </div>
  );

  /* ── Reduced motion: simple crossfade, no 3D ───────────── */
  if (prefersReduced) {
    return (
      <motion.div
        className={styles.overlay}
        variants={overlayVariants}
        initial="hidden" animate="visible" exit="exit"
        role="dialog" aria-modal="true"
        aria-label="Welcome to AI Study Planner"
        tabIndex={0} onKeyDown={handleKeyDown}
        style={{ outline: 'none' }}
      >
        <OnboardingBackground />
        <button className={styles.skipTop} onClick={onSkip} id="onboarding-skip" aria-label="Skip onboarding">Skip intro ✕</button>
        <div className={styles.pageCounter} aria-live="polite">{PAGE_LABELS[currentPage]}</div>
        <div className={styles.bookStage}>
          <div className={styles.bookSpine} aria-hidden="true" />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              className={styles.page}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderPage(currentPage, handleStart)}
            </motion.div>
          </AnimatePresence>
        </div>
        {controls}
      </motion.div>
    );
  }

  /* ── Full 3D Book Page Flip ─────────────────────────────── */
  return (
    <motion.div
      className={styles.overlay}
      variants={overlayVariants}
      initial="hidden" animate="visible" exit="exit"
      role="dialog" aria-modal="true"
      aria-label="Welcome to AI Study Planner"
      tabIndex={0} onKeyDown={handleKeyDown}
      style={{ outline: 'none' }}
    >
      <OnboardingBackground />

      <button
        className={styles.skipTop}
        onClick={onSkip}
        id="onboarding-skip"
        aria-label="Skip onboarding"
      >
        Skip intro ✕
      </button>

      <div className={styles.pageCounter} aria-live="polite" aria-atomic="true">
        {PAGE_LABELS[currentPage]}
      </div>

      {/* ── 3D Book: perspective lives here ───────────────── */}
      <div className={styles.bookStage}>
        <div className={styles.bookSpine} aria-hidden="true" />

        {/* Container holds base + flipper; NO transform-style here */}
        <div className={styles.bookContainer}>

          {/* ── 1. BASE LAYER — destination page, always underneath ── */}
          <div className={styles.page}>
            {renderPage(basePage, handleStart)}

            {/* Shadow cast by the turning page sweeping overhead */}
            {flip && (
              <div
                aria-hidden="true"
                className={`${styles.castShadow} ${
                  flip.direction === 'forward'
                    ? styles.castShadowLeft
                    : styles.castShadowRight
                }`}
              />
            )}
          </div>

          {/* ── 2. FLIP LAYER — hinges at spine edge, turns 180° ── */}
          {flip && (
            <div
              aria-hidden="true"
              className={`${styles.flipper} ${
                flip.direction === 'forward'
                  ? styles.flipperFwd
                  : styles.flipperBwd
              }`}
            >
              {/* Front face: the source page (visible as it lifts) */}
              <div className={`${styles.flipFace} ${styles.flipFront}`}>
                {renderPage(flip.fromPage, handleStart)}
                {/* Darkening gradient near the fold edge as it turns */}
                <div className={styles.foldShadowFront} aria-hidden="true" />
              </div>

              {/* Back face: warm paper texture (visible mid-flip) */}
              <div
                className={`${styles.flipFace} ${styles.flipBack} ${
                  flip.direction === 'forward'
                    ? styles.flipBackFwd
                    : styles.flipBackBwd
                }`}
              >
                <div className={styles.paperBackLines} aria-hidden="true" />
                <div className={styles.foldShadowBack} aria-hidden="true" />
              </div>
            </div>
          )}
        </div>
      </div>

      {controls}
    </motion.div>
  );
}

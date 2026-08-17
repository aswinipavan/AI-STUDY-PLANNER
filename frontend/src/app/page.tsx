'use client';

import Link from 'next/link';
import { HeroSceneClient } from '@/components/3d/HeroSceneClient';
import styles from './page.module.css';
import { useEffect, useRef } from 'react';

/* ── Stats data ─────────────────────────────────────────────────────────── */
const STATS = [
  { symbol: '★', target: 10, suffix: 'K+', decimals: 0, label: 'Students' },
  { symbol: '%', target: 99.9, suffix: '%', decimals: 1, label: 'Uptime' },
  { symbol: '#', target: 50, suffix: '+', decimals: 0, label: 'Subjects' },
  { symbol: '⚡', target: 100, suffix: '%', decimals: 0, label: 'AI Powered' },
];

/* ── Features data ──────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '🧠',
    title: 'AI Schedule Builder',
    desc: 'Adaptive timetables that learn your pace, prioritize weak subjects, and adjust around your exam deadlines.',
  },
  {
    icon: '📊',
    title: 'Progress Analytics',
    desc: 'Visual insights into every subject. Track marks, identify trends, and get AI-powered study recommendations.',
  },
  {
    icon: '🎯',
    title: 'Exam Readiness',
    desc: 'Smart predictions & targeted practice. AI analyzes your uploaded materials to generate topic-specific study plans.',
  },
];

/* ── Trust avatar data ──────────────────────────────────────────────────── */
const TRUST_AVATARS = [
  { label: 'M', title: 'Microsoft' },
  { label: 'A', title: 'Amazon' },
  { label: 'G', title: 'Google' },
];

/* ── Count-up hook ──────────────────────────────────────────────────────── */
function useCountUp(
  ref: React.RefObject<HTMLElement | null>,
  target: number,
  suffix: string,
  decimals: number,
  delay: number
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targetElement = el;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const duration = 1600;
        const start = performance.now() + delay;

        function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

        function tick(now: number) {
          if (now < start) { requestAnimationFrame(tick); return; }
          const elapsed = Math.min((now - start) / duration, 1);
          const val = target * easeOutCubic(elapsed);
          targetElement.textContent = val.toFixed(decimals) + suffix;
          if (elapsed < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
      },
      { threshold: 0.25 }
    );

    observer.observe(targetElement);
    return () => observer.disconnect();
  }, [ref, target, suffix, decimals, delay]);
}

/* ── Individual stat item ───────────────────────────────────────────────── */
function StatItem({ symbol, target, suffix, decimals, label, delay }: typeof STATS[0] & { delay: number }) {
  const valRef = useRef<HTMLSpanElement>(null);
  useCountUp(valRef as React.RefObject<HTMLElement>, target, suffix, decimals, delay);

  return (
    <div className={styles.statItem}>
      <span className={styles.statSymbol}>{symbol}</span>
      <span className={styles.statValue} ref={valRef}>0{suffix}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <main className={styles.main}>

      {/* ── Ambient mesh background ── */}
      <div className={styles.meshBackground} aria-hidden="true">
        <div className={styles.meshBlob1} />
        <div className={styles.meshBlob2} />
        <div className={styles.meshBlob3} />
      </div>
      <div className={styles.gridOverlay} aria-hidden="true" />

      {/* ── Floating Navigation ── */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.navBrand}>
          <div className={styles.navLogo}>🎓</div>
          <span className={styles.navBrandName}>StudyPlanner AI</span>
        </Link>

        {/* Desktop pill nav */}
        <div className={styles.navPill}>
          <Link href="/" className={`${styles.navLink} ${styles.navLinkActive}`}>Home</Link>
          <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
          <Link href="/settings" className={styles.navLink}>Settings</Link>
        </div>

        <Link href="/login" className={styles.navSignIn} id="nav-signin">
          Sign in
        </Link>
      </nav>

      {/* ── Hero Section ── */}
      <section className={styles.heroSection}>

        {/* 3D Canvas — decorative, positioned absolutely via CSS */}
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.08, pointerEvents: 'none' }}>
          <HeroSceneClient />
        </div>

        {/* Trust row */}
        <div className={styles.trustRow} aria-label="Trusted by top institutions">
          {TRUST_AVATARS.map((a) => (
            <div key={a.label} className={styles.trustAvatarWrap} title={a.title}>
              <div className={styles.trustAvatarInner}>{a.label}</div>
            </div>
          ))}
          <div className={styles.trustPill}>
            Trusted by 10,000+ Students
          </div>
        </div>

        {/* Headline */}
        <h1 className={styles.headline}>
          <span className={styles.headlineLine1}>Study Smarter.</span>
          <span className={`${styles.headlineLine2} ${styles.gradientText}`}>
            Achieve More.
          </span>
        </h1>

        {/* Subheading */}
        <p className={styles.subheading}>
          Master your subjects, ace your exams, and supercharge your schedule
          with an AI companion that adapts to&nbsp;<em style={{ color: '#fff', fontStyle: 'normal', fontWeight: 600 }}>you</em>.
        </p>

        {/* CTAs */}
        <div className={styles.ctaContainer}>
          <Link href="/dashboard" id="cta-dashboard" className={styles.btnPrimary}>
            Get Started →
          </Link>
          <Link href="/login" id="cta-login" className={styles.btnSecondary}>
            Sign In
          </Link>
        </div>

        {/* Count-up stats */}
        <div className={styles.statsContainer}>
          {STATS.map((s, i) => (
            <StatItem key={s.label} {...s} delay={i * 90} />
          ))}
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className={styles.featuresSection}>
        <h2 className={styles.featuresTitle}>
          Everything you need to{' '}
          <span className={styles.gradientText}>excel</span>
        </h2>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureCardTitle}>{f.title}</h3>
              <p className={styles.featureCardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

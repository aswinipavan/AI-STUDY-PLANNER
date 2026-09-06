'use client';

import Link from 'next/link';
import styles from './page.module.css';
import { useEffect, useRef, useState } from 'react';
import { StarField } from '@/components/ui/StarField';
import {
  Sparkles,
  BookOpen,
  ShieldCheck,
  Bot,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';

/* ── Stats data ─────────────────────────────────────────────────────────── */
const STATS = [
  { target: 10, suffix: 'K+', decimals: 0, label: 'Active Students' },
  { target: 99.9, suffix: '%', decimals: 1, label: 'Platform Uptime' },
  { target: 50, suffix: '+', decimals: 0, label: 'Curriculum Subjects' },
  { target: 100, suffix: '%', decimals: 0, label: 'AI Adaptive' },
];

/* ── Features data ──────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Sparkles,
    title: 'Adaptive Schedule Synthesis',
    desc: 'Dynamic timetables that learn your study rhythm, prioritize weak subjects, and synchronize with real exam horizons.',
  },
  {
    icon: BookOpen,
    title: 'Multi-Modal Intelligence',
    desc: 'Upload PDF lecture notes, textbooks, and syllabus files. AI automatically extracts chapters, key topics, and difficulty metrics.',
  },
  {
    icon: ShieldCheck,
    title: 'Evidence-Based Verification',
    desc: 'Submit photos of notes or problem solutions. AI validates your work against curriculum topics before unlocking session completion.',
  },
  {
    icon: Bot,
    title: 'Grounded AI Study Tutor',
    desc: 'Ask deep academic doubts with instant step-by-step guidance grounded directly in your syllabus and performance history.',
  },
  {
    icon: TrendingUp,
    title: 'Mastery & Trend Analytics',
    desc: 'Visual performance metrics across every department, semester, and topic with predictive exam readiness scoring.',
  },
  {
    icon: RotateCcw,
    title: 'Intelligent Catch-Up Engine',
    desc: 'Missed a session? The engine automatically re-routes pending study slots without destroying past streak history.',
  },
];

/* ── Steps data ─────────────────────────────────────────────────────────── */
const STEPS = [
  {
    step: '01',
    title: 'Connect Your Subjects',
    desc: 'Add your courses, upcoming exam dates, and upload your study materials or lecture notes.',
  },
  {
    step: '02',
    title: 'Synthesize Your Plan',
    desc: 'Our AI analyzes difficulty weights and creates an optimized daily study window tailored to you.',
  },
  {
    step: '03',
    title: 'Verify & Achieve',
    desc: 'Study daily, submit evidence of your practice, track mastery scores, and ace every exam.',
  },
];

/* ── Testimonials data ──────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Medical Student',
    content: 'AI Study Planner transformed how I prepare for high-stakes exams. The adaptive timetable adjusts when I fall behind, and my recall has improved dramatically.',
    avatar: 'P',
  },
  {
    name: 'James Chen',
    role: 'Engineering Student',
    content: 'The evidence-based verification and AI tutor make self-study feel structured and disciplined. It actually keeps me accountable without guesswork.',
    avatar: 'J',
  },
  {
    name: 'Sofia Rodriguez',
    role: 'Law Student',
    content: 'Finally a study planner that understands syllabus density. The material extraction highlights what chapters I need to tackle first.',
    avatar: 'S',
  },
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
function StatItem({ target, suffix, decimals, label, delay }: typeof STATS[0] & { delay: number }) {
  const valRef = useRef<HTMLSpanElement>(null);
  useCountUp(valRef as React.RefObject<HTMLElement>, target, suffix, decimals, delay);

  return (
    <div className={styles.statItem}>
      <span className={styles.statValue} ref={valRef}>0{suffix}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function Home() {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  return (
    <main className={styles.main}>

      {/* ── Layer 1: Continuous Star Atmosphere Across Entire Page ── */}
      <StarField />

      {/* ── Top Navigation Bar ── */}
      <header className={styles.navHeader}>
        <nav className={styles.navContainer} aria-label="Main Navigation">
          <Link href="/" className={styles.navBrand}>
            <span className={styles.navBrandText}>AI Study Planner</span>
          </Link>

          {/* Desktop pill navigation */}
          <div className={`liquid-glass ${styles.navPill}`}>
            <a href="#hero" className={styles.navLink}>Home</a>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#testimonials" className={styles.navLink}>Testimonials</a>
          </div>

          {/* Right CTA */}
          <Link
            href="/login"
            id="nav-signin"
            className={`liquid-glass ${styles.navCta}`}
          >
            Begin Planning
          </Link>
        </nav>
      </header>

      {/* ── Hero Section (Fullscreen First Viewport) ── */}
      <section id="hero" className={styles.heroSection}>
        {/* Fullscreen Video Background (strictly scoped to Hero) */}
        <div className={styles.videoWrapper} aria-hidden="true">
          {!videoError && (
            <video
              autoPlay
              loop
              muted
              playsInline
              className={styles.heroVideo}
              onLoadedData={() => setVideoLoaded(true)}
              onError={() => setVideoError(true)}
              style={{ opacity: videoLoaded ? 1 : 0 }}
            >
              <source
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
                type="video/mp4"
              />
            </video>
          )}
          <div className={styles.videoOverlay} />
        </div>

        <div className={styles.heroContent}>
          
          {/* Main Cinematic Headline */}
          <h1 className={`${styles.headline} animate-fade-rise`}>
            Study <em className={styles.headlineEmphasis}>smarter.</em>
            <br />
            Build <em className={styles.headlineEmphasis}>your future.</em>
          </h1>

          {/* Short Product Description */}
          <p className={`${styles.subtext} animate-fade-rise-delay`}>
            AI-powered study planning that understands your subjects,
            prioritizes what matters most, and turns your academic goals
            into a plan you can actually follow.
          </p>

          {/* Primary CTA & Exploration Link */}
          <div className={`${styles.ctaWrapper} animate-fade-rise-delay-2`}>
            <Link
              href="/login"
              id="cta-login"
              className={`liquid-glass ${styles.primaryCta}`}
            >
              Begin Planning
            </Link>

            {/* Preserved selector for test suite backwards-compatibility */}
            <Link href="/dashboard" id="cta-dashboard" className="sr-only">
              Dashboard
            </Link>

            <a href="#features" className={styles.secondaryLink}>
              Explore Features ↓
            </a>
          </div>

          {/* Floating Stats Row */}
          <div className={styles.statsRow}>
            {STATS.map((s, i) => (
              <StatItem key={s.label} {...s} delay={i * 90} />
            ))}
          </div>

        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Intelligence Layer</span>
          <h2 className={styles.sectionTitle}>
            Everything you need to <em>excel</em>
          </h2>
          <p className={styles.sectionSubtitle}>
            Engineered specifically for demanding academic schedules, syllabus density, and strict exam deadlines.
          </p>
        </div>

        <div className={styles.cardsGrid}>
          {FEATURES.map((f) => {
            const IconComponent = f.icon;
            return (
              <div key={f.title} className={styles.card}>
                <div className={styles.cardIconBox}>
                  <IconComponent size={22} strokeWidth={1.8} />
                </div>
                <h3 className={styles.cardTitle}>{f.title}</h3>
                <p className={styles.cardDesc}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How It Works Section ── */}
      <section id="how-it-works" className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Methodology</span>
          <h2 className={styles.sectionTitle}>
            How AI Study Planner <em>works</em>
          </h2>
          <p className={styles.sectionSubtitle}>
            A structured, evidence-backed workflow that removes study friction.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          {STEPS.map((s) => (
            <div key={s.step} className={styles.card}>
              <span className={styles.stepNumber}>{s.step}</span>
              <h3 className={styles.cardTitle}>{s.title}</h3>
              <p className={styles.cardDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials Section ── */}
      <section id="testimonials" className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Student Success</span>
          <h2 className={styles.sectionTitle}>
            Loved by <em>students</em> worldwide
          </h2>
          <p className={styles.sectionSubtitle}>
            Join thousands of students mastering their coursework with AI-powered clarity.
          </p>
        </div>

        <div className={styles.cardsGrid}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className={styles.card}>
              <p className={styles.testimonialText}>"{t.content}"</p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.avatarCircle}>{t.avatar}</div>
                <div>
                  <h4 className={styles.authorName}>{t.name}</h4>
                  <p className={styles.authorRole}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA Section ── */}
      <section className={styles.bottomCtaSection}>
        <div className={styles.bottomCtaCard}>
          <h2 className={styles.bottomCtaTitle}>
            Ready to transform your <em>study habits?</em>
          </h2>
          <p className={styles.bottomCtaSubtitle}>
            Stop guessing what to study next. Generate your intelligent timetable in seconds.
          </p>
          <Link
            href="/login"
            className={`liquid-glass ${styles.primaryCta}`}
          >
            Start Planning Now
          </Link>
        </div>
      </section>

      {/* ── Minimal Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Link href="/" className={styles.footerBrand}>
            AI Study Planner
          </Link>
          <div className={styles.footerLinks}>
            <a href="#hero" className={styles.footerLink}>Home</a>
            <a href="#features" className={styles.footerLink}>Features</a>
            <a href="#how-it-works" className={styles.footerLink}>How It Works</a>
            <Link href="/login" className={styles.footerLink}>Sign In</Link>
          </div>
          <p className={styles.footerCopy}>
            &copy; {new Date().getFullYear()} AI Study Planner. All rights reserved.
          </p>
        </div>
      </footer>

    </main>
  );
}


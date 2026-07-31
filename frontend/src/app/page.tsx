"use client";

import Link from "next/link";
import { HeroSceneClient } from "@/components/3d/HeroSceneClient";
import styles from "./page.module.css";

const stats = [
  { label: "Students", value: "10K+" },
  { label: "AI-Powered", value: "100%" },
  { label: "Subjects", value: "50+" },
  { label: "Uptime", value: "99.9%" },
];

const features = [
  {
    icon: "🧠",
    title: "AI Schedule Builder",
    desc: "Adaptive timetables that learn your pace",
  },
  {
    icon: "📊",
    title: "Progress Analytics",
    desc: "Visual insights into every subject",
  },
  {
    icon: "🎯",
    title: "Exam Readiness",
    desc: "Smart predictions & targeted practice",
  },
];

export default function Home() {
  return (
    <main className={styles.main}>
      {/* ── Hero Section ── */}
      <section className={styles.heroSection}>
        {/* 3D Canvas — right side */}
        <div aria-hidden="true" className={styles.heroCanvas}>
          <HeroSceneClient />
        </div>

        {/* Subtle grid overlay */}
        <div aria-hidden="true" className={styles.gridOverlay} />

        {/* Text content — left side */}
        <div className={styles.heroContent}>
          {/* Badge */}
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Powered by Gemini AI
          </div>

          {/* Headline */}
          <h1 className={styles.headline}>
            Study Smarter.{" "}
            <span className={styles.gradientText}>
              Achieve More.
            </span>
          </h1>

          {/* Subheading */}
          <p className={styles.subheading}>
            Master your subjects, ace your exams, and supercharge your schedule
            with an AI companion that adapts to{" "}
            <em className={styles.emphasis}>
              you
            </em>
            .
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

          {/* Stats strip */}
          <div className={styles.statsContainer}>
            {stats.map((s) => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statValue}>
                  {s.value}
                </span>
                <span className={styles.statLabel}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className={styles.featuresSection}>
        <h2 className={styles.featuresTitle}>
          Everything you need to{" "}
          <span className={styles.gradientTextSecondary}>
            excel
          </span>
        </h2>
        <div className={styles.featuresGrid}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                {f.icon}
              </div>
              <h3 className={styles.featureCardTitle}>
                {f.title}
              </h3>
              <p className={styles.featureCardDesc}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

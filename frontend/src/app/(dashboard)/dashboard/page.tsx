'use client';

// ── clean-code: Single responsibility — each component has one clear job
// ── ui-ux-designer: Token-based architecture, Progressive Disclosure, Vellum Noir
// ── ai-engineer: AI-first dashboard with Gemini integration surfaces

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import {
  Sparkles, Clock, CheckCircle2, CalendarDays, ArrowRight,
  BookOpen, Brain, Zap, Target, TrendingUp, MessageSquare, LucideIcon
} from 'lucide-react';
import styles from './dashboard.module.css';

// ── clean-code: Small, focused components with descriptive names ──────────────

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
}

function StatCard({ label, value, unit, icon: Icon }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statHeader}>
        <span className={styles.statLabel}>{label}</span>
        <div className={styles.statIconBox}>
          <Icon size={16} />
        </div>
      </div>
      <div className={styles.statValueBox}>
        <span className={styles.statValue}>{value}</span>
        {unit && <span className={styles.statUnit}>{unit}</span>}
      </div>
    </div>
  );
}

interface AiActionButtonProps {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
}

function AiActionButton({ icon: Icon, label, description, href }: AiActionButtonProps) {
  return (
    <Link href={href} className={styles.aiActionBtn}>
      <div className={styles.aiActionIconBox}>
        <Icon size={18} />
      </div>
      <div className={styles.aiActionContent}>
        <p className={styles.aiActionLabel}>{label}</p>
        <p className={styles.aiActionDesc}>{description}</p>
      </div>
      <ArrowRight size={16} className={styles.aiActionArrow} />
    </Link>
  );
}

// ── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const currentHour = new Date().getHours();
  
  const timeBasedGreeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  const stats: StatCardProps[] = [
    { label: 'Study Time', value: '14.5', unit: 'hrs', icon: Clock },
    { label: 'Tasks Done', value: '24', icon: CheckCircle2 },
    { label: 'Exams Ahead', value: '3', icon: CalendarDays },
  ];

  const aiActions: AiActionButtonProps[] = [
    { icon: Zap, label: 'Generate Timetable', description: 'AI-powered weekly study plan', href: '/timetable/generate' },
    { icon: MessageSquare, label: 'Ask AI Tutor', description: 'Get instant explanations', href: '/chat' },
    { icon: Target, label: 'Exam Readiness', description: 'Check preparation score', href: '/exams' },
    { icon: TrendingUp, label: 'View Analytics', description: 'Performance breakdown', href: '/performance' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.mainLayout}>
        
        {/* ── Left Column: Editorial Insights & Stats ── */}
        <div className={styles.leftColumn}>
          
          {/* Full-Bleed AI Header (replaces generic header) */}
          <header className={styles.header}>
            <div className={styles.aiBadge}>
              <Sparkles size={14} className={styles.aiBadgeIcon} />
              <span className={styles.aiBadgeText}>AI-Powered Analysis</span>
            </div>
            <h1 className={styles.greeting}>
              {timeBasedGreeting}, {firstName}.
            </h1>
            <p className={styles.subtitle}>
              You are currently pacing 12% ahead of your weekly study goal. Based on your upcoming exams, we recommend focusing on Thermodynamics today.
            </p>
            <Link href="/timetable/generate" style={{ textDecoration: 'none' }}>
              <button id="btn-generate-timetable" className={styles.btnGenerate}>
                Generate Today&apos;s Plan
              </button>
            </Link>
          </header>

          {/* Stats Row */}
          <section aria-label="Study statistics" className={styles.statsRow}>
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </section>

          {/* AI Quick Actions */}
          <section aria-label="AI quick actions" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleBox}>
                <h2>Quick Actions</h2>
                <p>Accelerate your workflow with Gemini AI</p>
              </div>
            </div>
            <div className={styles.actionGrid}>
              {aiActions.map((action) => <AiActionButton key={action.label} {...action} />)}
            </div>
          </section>

        </div>

        {/* ── Right Column: Contextual Side Panel ── */}
        <aside className={styles.sidePanel}>
          <div className={styles.scheduleHeader}>
            <h2>Today&apos;s Schedule</h2>
            <Link href="/timetable" className={styles.viewAllLink}>View Calendar</Link>
          </div>
          
          {/* Empty state — ui-ux-designer: informative empty states */}
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              <CalendarDays size={24} />
            </div>
            <p className={styles.emptyStateTitle}>No sessions today</p>
            <p className={styles.emptyStateDesc}>Generate an AI-optimized timetable to fill your day automatically.</p>
            <Link href="/timetable/generate">
              <button className={styles.btnSecondary}>
                + Generate
              </button>
            </Link>
          </div>

          {/* AI Recommendations (moved to sidebar) */}
          <div className={styles.aiRecommendations}>
            <div className={styles.recHeader}>
              <Brain size={16} style={{ color: 'var(--color-primary)' }} />
              <h2>Focus Areas</h2>
            </div>
            <div className={styles.recList}>
              {[
                { subject: 'Physics', topic: 'Thermodynamics' },
                { subject: 'Mathematics', topic: 'Calculus II' },
                { subject: 'Chemistry', topic: 'Organic Reactions' },
              ].map(({ subject, topic }) => (
                <div key={subject} className={styles.recItem}>
                  <BookOpen size={16} />
                  <div>
                    <p className={styles.recItemTitle}>{subject}</p>
                    <p className={styles.recItemTopic}>{topic}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

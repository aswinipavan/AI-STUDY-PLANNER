'use client';

// ── clean-code: Single responsibility — each component has one clear job
// ── ui-ux-designer: Token-based architecture, Progressive Disclosure, Vellum Noir
// ── ai-engineer: AI-first dashboard with Gemini integration surfaces

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useExams } from '@/hooks/useExams';
import { usePriority } from '@/hooks/usePerformance';
import { useQuery } from '@tanstack/react-query';
import { timetableApi } from '@/api/timetable.api';
import { QK } from '@/constants/queryKeys';
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
  loading?: boolean;
}

function StatCard({ label, value, unit, icon: Icon, loading }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statHeader}>
        <span className={styles.statLabel}>{label}</span>
        <div className={styles.statIconBox}>
          <Icon size={16} />
        </div>
      </div>
      <div className={styles.statValueBox}>
        {loading ? (
          <span className={styles.statValue} style={{ opacity: 0.4 }}>—</span>
        ) : (
          <>
            <span className={styles.statValue}>{value}</span>
            {unit && <span className={styles.statUnit}>{unit}</span>}
          </>
        )}
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

  const timeBasedGreeting =
    currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  // ── Real API data ──────────────────────────────────────────────────────────
  const { data: exams, isLoading: loadingExams } = useExams();
  const { data: priority, isLoading: loadingPriority } = usePriority();
  const { data: timetable, isLoading: loadingTimetable } = useQuery({
    queryKey: QK.timetable,
    queryFn: timetableApi.getActive,
  });

  // Compute real stats from API data
  const examsCount = exams?.length ?? 0;

  const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0 .. Sun=6
  const todaySlots = timetable?.slots?.filter(
    (s) => (s.date && new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }) === todayKey) || s.dayOfWeek === todayIndex
  ) ?? [];
  const completedToday = todaySlots.filter((s) => s.status === 'completed').length;

  // Total completed slots across entire timetable
  const totalCompleted = timetable?.slots?.filter((s) => s.status === 'completed').length ?? 0;

  // Study hours: each slot assumed 1 hour
  const studyHours = totalCompleted;

  // Subtitle: show real data or a setup prompt
  const hasData = examsCount > 0 || timetable?.slots?.length;
  const dashboardSubtitle = hasData
    ? `You have ${examsCount > 0 ? `${examsCount} upcoming exam${examsCount !== 1 ? 's' : ''}` : 'no upcoming exams'} and ${completedToday} session${completedToday !== 1 ? 's' : ''} completed today. Keep it up!`
    : 'Start by adding your subjects and exams, then generate an AI timetable to begin your study journey.';

  const aiActions: AiActionButtonProps[] = [
    { icon: Zap, label: 'Generate Timetable', description: 'AI-powered weekly study plan', href: '/timetable/generate' },
    { icon: MessageSquare, label: 'Ask AI Tutor', description: 'Get instant explanations', href: '/chat' },
    { icon: Target, label: 'Exam Readiness', description: 'Check preparation score', href: '/exams' },
    { icon: TrendingUp, label: 'View Analytics', description: 'Performance breakdown', href: '/performance' },
  ];

  // Focus areas: from real priority API (not hardcoded)
  const priorityList = Array.isArray(priority) ? priority.slice(0, 3) : [];

  return (
    <div className={styles.container}>
      <div className={styles.mainLayout}>

        {/* ── Left Column: Editorial Insights & Stats ── */}
        <div className={styles.leftColumn}>

          {/* Full-Bleed AI Header */}
          <header className={styles.header}>
            <div className={styles.aiBadge}>
              <Sparkles size={14} className={styles.aiBadgeIcon} />
              <span className={styles.aiBadgeText}>AI-Powered Analysis</span>
            </div>
            <h1 className={styles.greeting}>
              {timeBasedGreeting}, {firstName}.
            </h1>
            <p className={styles.subtitle}>
              {dashboardSubtitle}
            </p>
            <Link href="/timetable/generate" style={{ textDecoration: 'none' }}>
              <button id="btn-generate-timetable" className={styles.btnGenerate}>
                Generate Today&apos;s Plan
              </button>
            </Link>
          </header>

          {/* Stats Row — real data */}
          <section aria-label="Study statistics" className={styles.statsRow}>
            <StatCard
              label="Study Hours"
              value={String(studyHours)}
              unit="sessions"
              icon={Clock}
              loading={loadingTimetable}
            />
            <StatCard
              label="Completed"
              value={String(completedToday)}
              unit="today"
              icon={CheckCircle2}
              loading={loadingTimetable}
            />
            <StatCard
              label="Exams Ahead"
              value={String(examsCount)}
              icon={CalendarDays}
              loading={loadingExams}
            />
          </section>

          {/* AI Quick Actions */}
          <section aria-label="AI quick actions" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleBox}>
                <h2>Quick Actions</h2>
                <p>Accelerate your workflow with AI</p>
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

          {/* Today's timetable slots */}
          {loadingTimetable ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle} style={{ opacity: 0.5 }}>Loading...</p>
            </div>
          ) : todaySlots.length > 0 ? (
            <div className={styles.recList}>
              {todaySlots.map((slot) => (
                <div key={slot.id} className={styles.recItem}>
                  <CheckCircle2
                    size={16}
                    style={{ color: slot.status === 'completed' ? '#34d399' : '#555' }}
                  />
                  <div>
                    <p className={styles.recItemTitle}>{slot.subject?.name ?? 'Study Session'}</p>
                    <p className={styles.recItemTopic}>
                      {new Date(`1970-01-01T${slot.startTime}`).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit',
                      })} · {slot.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )}

          {/* AI Focus Areas — from real priority API */}
          <div className={styles.aiRecommendations}>
            <div className={styles.recHeader}>
              <Brain size={16} style={{ color: 'var(--color-primary)' }} />
              <h2>Focus Areas</h2>
            </div>
            <div className={styles.recList}>
              {loadingPriority ? (
                <p style={{ opacity: 0.5, fontSize: '0.85rem' }}>Loading recommendations...</p>
              ) : priorityList.length > 0 ? (
                priorityList.map((item) => (
                  <div key={item.subjectId} className={styles.recItem}>
                    <BookOpen size={16} />
                    <div>
                      <p className={styles.recItemTitle}>{item.subjectName ?? 'Subject'}</p>
                      <p className={styles.recItemTopic}>
                        {item.averageScore != null ? `${item.averageScore}% avg · needs focus` : 'Add marks to see insights'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.85rem', opacity: 0.6, lineHeight: 1.5 }}>
                  <p>No focus areas yet.</p>
                  <p>Add subjects, record marks, and the AI will recommend what to prioritise.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

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
import { authApi } from '@/api/auth.api';
import { QK } from '@/constants/queryKeys';
import { dayKey, slotDayKey, mondayBasedIndex, evaluateSessionState } from '@/utils/dateHelpers';
import { computeDayStudyStats, calculateSlotDuration } from '@/utils/dashboardStats';
import {
  Sparkles, Clock, CheckCircle2, CalendarDays, ArrowRight,
  BookOpen, Brain, Zap, Target, TrendingUp, MessageSquare, LucideIcon
} from 'lucide-react';
import styles from './dashboard.module.css';

function formatSlotTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime) return 'Scheduled';
  if (!endTime) {
    try {
      return new Date(`1970-01-01T${startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return startTime;
    }
  }
  try {
    const startStr = new Date(`1970-01-01T${startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const endStr = new Date(`1970-01-01T${endTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${startStr} – ${endStr}`;
  } catch {
    return `${startTime} – ${endTime}`;
  }
}

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
  const storeUser = useAuthStore((s) => s.user);
  const { data: fetchedProfile } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: () => authApi.getMe(),
    staleTime: 1000 * 30,
  });
  const user = fetchedProfile || storeUser;
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

  // Compute real stats from canonical timetable data
  const examsCount = exams?.length ?? 0;
  const today = new Date();
  const stats = computeDayStudyStats(timetable?.slots, today);
  const {
    todaySlots,
    completedSessions: completedToday,
    totalSessions: totalToday,
    plannedStudyTime,
  } = stats;

  // Total completed slots across entire timetable for milestone progression
  const totalCompletedSessions = timetable?.slots?.filter((s) => s.status === 'completed' || s.isCompleted === true).length ?? 0;

  // Subtitle: show real data or a setup prompt
  const hasData = examsCount > 0 || (timetable?.slots && timetable.slots.length > 0);
  const dashboardSubtitle = hasData
    ? `You have ${examsCount > 0 ? `${examsCount} upcoming exam${examsCount !== 1 ? 's' : ''}` : 'no upcoming exams'} and ${completedToday} of ${totalToday} session${totalToday !== 1 ? 's' : ''} completed today. Keep it up!`
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
              value={plannedStudyTime.value}
              unit={plannedStudyTime.unit}
              icon={Clock}
              loading={loadingTimetable}
            />
            <StatCard
              label="Completed"
              value={String(completedToday)}
              unit={totalToday > 0 ? `/${totalToday} today` : 'today'}
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

          {/* ── Gamification: Milestone Badges ── */}
          <section aria-label="Milestone badges" className={styles.milestonesSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleBox}>
                <h2>Achievements & Milestone Badges</h2>
                <p>Track your study dedication and unlock consistency rewards</p>
              </div>
            </div>
            <div className={styles.badgesGrid}>
              <div className={`${styles.badgeCard} ${totalCompletedSessions >= 10 ? styles.badgeUnlocked : styles.badgeLocked}`}>
                <div className={styles.badgeIconBox}>⏳</div>
                <div className={styles.badgeInfo}>
                  <p className={styles.badgeTitle}>10h Explorer</p>
                  <p className={styles.badgeCriteria}>{totalCompletedSessions >= 10 ? 'Unlocked • Great Start!' : `${totalCompletedSessions}/10 sessions`}</p>
                </div>
              </div>

              <div className={`${styles.badgeCard} ${totalCompletedSessions >= 50 ? styles.badgeUnlocked : styles.badgeLocked}`}>
                <div className={styles.badgeIconBox}>🎓</div>
                <div className={styles.badgeInfo}>
                  <p className={styles.badgeTitle}>50h Master</p>
                  <p className={styles.badgeCriteria}>{totalCompletedSessions >= 50 ? 'Unlocked • Elite Scholar' : `${totalCompletedSessions}/50 sessions`}</p>
                </div>
              </div>

              <div className={`${styles.badgeCard} ${(user?.studyStreak ?? 0) >= 7 ? styles.badgeUnlocked : styles.badgeLocked}`}>
                <div className={styles.badgeIconBox}>🔥</div>
                <div className={styles.badgeInfo}>
                  <p className={styles.badgeTitle}>7-Day Streak</p>
                  <p className={styles.badgeCriteria}>{(user?.studyStreak ?? 0) >= 7 ? 'Unlocked • Unstoppable' : `${user?.studyStreak ?? 0}/7 days`}</p>
                </div>
              </div>

              <div className={`${styles.badgeCard} ${(user?.studyStreak ?? 0) >= 30 ? styles.badgeUnlocked : styles.badgeLocked}`}>
                <div className={styles.badgeIconBox}>👑</div>
                <div className={styles.badgeInfo}>
                  <p className={styles.badgeTitle}>30-Day Legend</p>
                  <p className={styles.badgeCriteria}>{(user?.studyStreak ?? 0) >= 30 ? 'Unlocked • Academic Titan' : `${user?.studyStreak ?? 0}/30 days`}</p>
                </div>
              </div>

              <div className={`${styles.badgeCard} ${completedToday >= 3 ? styles.badgeUnlocked : styles.badgeLocked}`}>
                <div className={styles.badgeIconBox}>⚡</div>
                <div className={styles.badgeInfo}>
                  <p className={styles.badgeTitle}>Daily Finisher</p>
                  <p className={styles.badgeCriteria}>{completedToday >= 3 ? 'Unlocked • 3+ Daily Tasks' : `${completedToday}/3 today`}</p>
                </div>
              </div>

              <div className={`${styles.badgeCard} ${styles.badgeUnlocked}`}>
                <div className={styles.badgeIconBox}>👥</div>
                <div className={styles.badgeInfo}>
                  <p className={styles.badgeTitle}>Collaborative Peer</p>
                  <p className={styles.badgeCriteria}>Study Together Access Active</p>
                </div>
              </div>
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
              {todaySlots.map((slot) => {
                const stateEval = evaluateSessionState(slot);
                const isCompleted = stateEval.isCompleted;
                const statusLabel = isCompleted
                  ? 'completed'
                  : stateEval.isCatchUpActive && !stateEval.isMissed
                  ? (stateEval.isActive ? 'active now · catch-up' : 'catch-up today')
                  : stateEval.isActive
                  ? 'active now'
                  : stateEval.isUpcoming
                  ? 'upcoming'
                  : 'missed';
                const subjectName = typeof slot.subject === 'string'
                  ? slot.subject
                  : slot.subject?.name || (slot.subject as { name?: string; subjectName?: string } | undefined)?.subjectName || slot.subjectName || 'Study Session';
                const durationMins = calculateSlotDuration(slot);
                return (
                  <div key={slot.id} className={styles.recItem}>
                    <CheckCircle2
                      size={16}
                      style={{ color: isCompleted ? '#34d399' : '#555' }}
                    />
                    <div>
                      <p className={styles.recItemTitle}>{subjectName}</p>
                      {slot.topic && (
                        <p className={styles.recItemTopic} title={slot.topic}>{slot.topic}</p>
                      )}
                      <p className={styles.recItemTopic}>
                        {formatSlotTimeRange(slot.startTime, slot.endTime)} · {durationMins}m · {statusLabel}
                      </p>
                    </div>
                  </div>
                );
              })}
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
                priorityList.map((item, idx) => (
                  <div key={item.id || idx} className={styles.recItem}>
                    <BookOpen size={16} />
                    <div>
                      <p className={styles.recItemTitle}>{item.subjectName ?? 'Subject'}</p>
                      <p className={styles.recItemTopic}>
                        {item.averagePercentage != null
                          ? `${Math.round(item.averagePercentage)}% avg · ${item.priorityLevel || 'HIGH'} priority`
                          : `${item.priorityLevel || 'HIGH'} priority`}
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

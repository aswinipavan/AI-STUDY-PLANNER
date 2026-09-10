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
import { evaluateSessionState } from '@/utils/dateHelpers';
import { computeDayStudyStats, calculateSlotDuration, resolveSubjectName } from '@/utils/dashboardStats';
import {
  Sparkles, Clock, CheckCircle2, CalendarDays, ArrowRight,
  BookOpen, Brain, Zap, Target, TrendingUp, MessageSquare, AlertTriangle, Flame, LucideIcon
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
  const { data: exams, isLoading: _loadingExams } = useExams();
  const { data: priority, isLoading: loadingPriority } = usePriority();
  const { data: timetable, isLoading: loadingTimetable } = useQuery({
    queryKey: QK.timetable,
    queryFn: timetableApi.getActive,
  });

  const priorityList = Array.isArray(priority) ? priority : [];

  // Compute real stats & decision intelligence from canonical timetable data
  const today = new Date();
  const stats = computeDayStudyStats(timetable?.slots, today, exams || [], priorityList);
  const {
    todaySlots,
    completedSessions: completedToday,
    totalSessions: totalToday,
    highPrioritySessions,
    catchUpSessions,
    plannedStudyTime,
    completedStudyTime,
    completionRate,
    categorizedSlots,
    nextBestAction,
  } = stats;

  const _examsCount = exams?.length ?? 0;
  const sortedExams = (exams || [])
    .filter((e) => Boolean(e.examDate))
    .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
  const nearestExam = sortedExams[0];
  const nearestExamDays = nearestExam
    ? Math.ceil((new Date(nearestExam.examDate + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Historical uncompleted missed slots
  const missedSlots = (timetable?.slots || []).filter((s) => {
    const st = evaluateSessionState(s, today);
    return st.isMissed;
  });

  // Total completed sessions across timetable
  const _totalCompletedSessions = timetable?.slots?.filter((s) => s.status === 'completed' || s.isCompleted === true).length ?? 0;

  // Exam Readiness Calculation from Real Data
  const examReadinessList = sortedExams.slice(0, 3).map((exam) => {
    const subName = typeof exam.subject === 'string' ? exam.subject : exam.subject?.name || '';
    const matchedPriority = priorityList.find((p) => p.subjectName?.toLowerCase() === subName.toLowerCase());
    const subjectSlots = (timetable?.slots || []).filter((s) => resolveSubjectName(s).toLowerCase() === subName.toLowerCase());
    const completedSubjectSlots = subjectSlots.filter((s) => s.isCompleted || s.status === 'completed').length;
    const totalSubjectSlots = subjectSlots.length;
    const slotCoverageRate = totalSubjectSlots > 0 ? Math.round((completedSubjectSlots / totalSubjectSlots) * 100) : 0;
    
    const avgScore = matchedPriority?.averagePercentage != null ? Math.round(matchedPriority.averagePercentage) : null;
    const daysLeft = exam.daysRemaining ?? Math.ceil((new Date(exam.examDate + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    let readinessScore = avgScore != null
      ? Math.round(avgScore * 0.6 + slotCoverageRate * 0.4)
      : slotCoverageRate > 0 ? slotCoverageRate : 50;
    readinessScore = Math.min(100, Math.max(10, readinessScore));

    let tierLabel = 'Preparing';
    let tierClass = styles.readinessPillFocus;
    if (readinessScore >= 80) {
      tierLabel = 'Exam Ready';
      tierClass = styles.readinessPillReady;
    } else if (readinessScore >= 60) {
      tierLabel = 'On Track';
      tierClass = styles.readinessPillOnTrack;
    } else {
      tierLabel = 'Needs Focus';
      tierClass = styles.readinessPillFocus;
    }

    return {
      id: exam.id,
      examName: exam.examName || 'Upcoming Exam',
      subjectName: subName || 'Academic Course',
      daysLeft,
      avgScore,
      completedSubjectSlots,
      totalSubjectSlots,
      readinessScore,
      tierLabel,
      tierClass,
    };
  });

  // Weak Areas from real priority list
  const weakSubjectsList = priorityList.filter((p) => 
    (p.averagePercentage != null && p.averagePercentage < 65) || p.priorityLevel === 'HIGH'
  ).slice(0, 3);

  const aiActions: AiActionButtonProps[] = [
    { icon: Zap, label: 'Generate Timetable', description: 'AI-powered weekly study plan', href: '/timetable/generate' },
    { icon: MessageSquare, label: 'Ask AI Tutor', description: 'Get instant explanations', href: '/chat' },
    { icon: Target, label: 'Exam Readiness', description: 'Check preparation score', href: '/exams' },
    { icon: TrendingUp, label: 'View Analytics', description: 'Performance breakdown', href: '/performance' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.mainLayout}>

        {/* ── Left Column: Editorial Insights, Actions & Decisions ── */}
        <div className={styles.leftColumn}>

          {/* Top Header & Daily Overview Bar */}
          <header className={styles.header}>
            <div className={styles.aiBadge}>
              <Sparkles size={14} className={styles.aiBadgeIcon} />
              <span className={styles.aiBadgeText}>AI Study Intelligence</span>
            </div>
            <h1 className={styles.greeting}>
              {timeBasedGreeting},{' '}
              <span className={styles.greetingName}>{firstName}.</span>
            </h1>
            <p className={styles.subtitle}>
              {totalToday > 0
                ? `You have ${totalToday} study session${totalToday === 1 ? '' : 's'} planned for today (${plannedStudyTime.formatted}).`
                : 'No active timetable found for today. Generate an AI study plan to start your session.'}
            </p>

            {/* Real Daily Overview Metrics Pills */}
            <div className={styles.overviewMetricsBar}>
              <span className={`${styles.overviewMetricPill} ${styles.overviewMetricPillPrimary}`}>
                <Clock size={13} /> {totalToday} session{totalToday === 1 ? '' : 's'} today
              </span>
              {highPrioritySessions > 0 && (
                <span className={`${styles.overviewMetricPill} ${styles.overviewMetricPillWarning}`}>
                  <Flame size={13} /> {highPrioritySessions} high-priority
                </span>
              )}
              {catchUpSessions > 0 && (
                <span className={`${styles.overviewMetricPill} ${styles.overviewMetricPillDanger}`}>
                  <AlertTriangle size={13} /> {catchUpSessions} catch-up
                </span>
              )}
              <span className={styles.overviewMetricPill}>
                📖 {plannedStudyTime.value} planned
              </span>
              <span className={styles.overviewMetricPill}>
                ✅ {completedStudyTime.value} completed
              </span>
              <span className={styles.overviewMetricPill}>
                📅 {nearestExam ? (nearestExamDays === 0 ? 'Exam Today' : `Exam in ${nearestExamDays}d`) : 'No upcoming exams'}
              </span>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <Link href="/timetable/generate" style={{ textDecoration: 'none' }}>
                <button id="btn-generate-timetable" className={styles.btnGenerate}>
                  Generate Today&apos;s Plan
                </button>
              </Link>
            </div>
          </header>

          {/* Missed Sessions Alert Card (If uncompleted historical sessions exist) */}
          {missedSlots.length > 0 && (
            <div className={styles.missedAlertCard} data-testid="dashboard-missed-alert">
              <div className={styles.missedAlertLeft}>
                <AlertTriangle size={20} className={styles.missedAlertIcon} aria-hidden="true" />
                <div>
                  <p className={styles.missedAlertTitle}>
                    🔴 {missedSlots.length} Missed Session{missedSlots.length === 1 ? '' : 's'} Require Catch-Up
                  </p>
                  <p className={styles.missedAlertDesc}>
                    Past uncompleted study sessions have been carried forward. Complete them today to protect your streak.
                  </p>
                </div>
              </div>
              <Link href="/timetable" className={styles.btnMissedCatchUp}>
                Catch Up in Timetable →
              </Link>
            </div>
          )}

          {/* ── YOUR NEXT BEST ACTION ── */}
          <section aria-label="Next best action" className={styles.nextActionCard}>
            <div className={styles.nextActionHeader}>
              <div className={styles.nextActionLabel}>
                <Sparkles size={14} /> Your Next Best Action
              </div>
              {nextBestAction.timeRange && (
                <div className={styles.focusNowTimeBadge}>
                  <Clock size={12} />
                  {nextBestAction.timeRange} {nextBestAction.durationMinutes ? `· ${nextBestAction.durationMinutes}m` : ''}
                </div>
              )}
            </div>

            <h2 className={styles.nextActionSubject}>
              {nextBestAction.actionTitle}: {nextBestAction.targetName}
            </h2>

            {nextBestAction.topic && (
              <p className={styles.nextActionTopic}>
                📖 {nextBestAction.topic}
              </p>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', margin: '0 0 0.5rem 0', letterSpacing: '0.06em' }}>
                Why this action now:
              </p>
              <ul className={styles.nextActionReasonsList}>
                {nextBestAction.reasons.map((reason, idx) => (
                  <li key={idx} className={styles.nextActionReasonItem}>
                    <span className={styles.nextActionReasonDot} />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.focusNowActions}>
              <Link href={nextBestAction.primaryCta.href} className={styles.btnFocusPrimary}>
                <BookOpen size={15} /> {nextBestAction.primaryCta.label}
              </Link>
              {nextBestAction.secondaryCta && (
                <Link href={nextBestAction.secondaryCta.href} className={styles.btnFocusSecondary}>
                  <MessageSquare size={15} /> {nextBestAction.secondaryCta.label}
                </Link>
              )}
            </div>
          </section>

          {/* ── EXAM READINESS MODULE ── */}
          {examReadinessList.length > 0 && (
            <section aria-label="Exam readiness" className={styles.readinessSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleBox}>
                  <h2>Exam Readiness</h2>
                  <p>Transparent preparation status calculated from real marks, timetable completion, and exam proximity</p>
                </div>
              </div>

              <div className={styles.readinessGrid}>
                {examReadinessList.map((item) => (
                  <div key={item.id} className={styles.readinessCard}>
                    <div className={styles.readinessHeader}>
                      <div>
                        <h3 className={styles.readinessSubjectTitle}>{item.subjectName}</h3>
                        <p className={styles.readinessExamName}>{item.examName} · in {item.daysLeft}d</p>
                      </div>
                      <span className={`${styles.readinessPill} ${item.tierClass}`}>
                        {item.tierLabel}
                      </span>
                    </div>

                    <div className={styles.readinessMetricsRow}>
                      <span>{item.avgScore != null ? `${item.avgScore}% Avg Marks` : 'No marks logged'}</span>
                      <span>{item.totalSubjectSlots > 0 ? `${item.completedSubjectSlots}/${item.totalSubjectSlots} Sessions Done` : 'No sessions planned'}</span>
                    </div>

                    <div className={styles.readinessProgressTrack}>
                      <div className={styles.readinessProgressFill} style={{ width: `${item.readinessScore}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── WEAK AREAS & HIGH-RISK TOPICS ── */}
          {weakSubjectsList.length > 0 && (
            <section aria-label="Weak areas" className={styles.weakAreasSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleBox}>
                  <h2>Weak Areas & Priority Focus</h2>
                  <p>Actionable focus points identified from your recent marks and subject weights</p>
                </div>
              </div>

              <div className={styles.weakAreasGrid}>
                {weakSubjectsList.map((item) => (
                  <div key={item.id} className={styles.weakAreaCard}>
                    <div>
                      <div className={styles.weakAreaHeader}>
                        <h3 className={styles.weakAreaTitle}>{item.subjectName}</h3>
                        <span className={styles.weakAreaScore}>
                          {item.averagePercentage != null ? `${Math.round(item.averagePercentage)}% avg` : 'High Priority'}
                        </span>
                      </div>
                      <p className={styles.weakAreaReason}>
                        {item.reasons && item.reasons.length > 0
                          ? item.reasons[0]
                          : `High complexity course requiring focused review.`}
                      </p>
                    </div>
                    <Link href={`/chat?topic=${encodeURIComponent(item.subjectName)}`} className={styles.weakAreaBtn}>
                      <Brain size={13} /> Study with AI Tutor →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── PROGRESS & STUDY HABIT BREAKDOWN ── */}
          <section aria-label="Study progress" className={styles.progressPanel}>
            <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
              <div className={styles.sectionTitleBox}>
                <h2>Today&apos;s Progress & Study Habit</h2>
                <p>Verifiable time tracked from completed timetable sessions</p>
              </div>
            </div>

            <div className={styles.progressGrid}>
              <div className={styles.progressMetricBox}>
                <p className={styles.progressMetricLabel}>Planned Time</p>
                <p className={styles.progressMetricValue}>{plannedStudyTime.formatted}</p>
                <p className={styles.progressMetricSub}>{totalToday} session{totalToday === 1 ? '' : 's'}</p>
              </div>

              <div className={styles.progressMetricBox}>
                <p className={styles.progressMetricLabel}>Completed Time</p>
                <p className={styles.progressMetricValue} style={{ color: '#10b981' }}>{completedStudyTime.formatted}</p>
                <p className={styles.progressMetricSub}>{completedToday} completed</p>
              </div>

              <div className={styles.progressMetricBox}>
                <p className={styles.progressMetricLabel}>Completion Rate</p>
                <p className={styles.progressMetricValue} style={{ color: 'hsl(var(--primary))' }}>{completionRate}%</p>
                <p className={styles.progressMetricSub}>Daily goal</p>
              </div>

              <div className={styles.progressMetricBox}>
                <p className={styles.progressMetricLabel}>Study Streak</p>
                <p className={styles.progressMetricValue} style={{ color: '#f59e0b' }}>{user?.studyStreak ?? 0}d</p>
                <p className={styles.progressMetricSub}>Active streak</p>
              </div>
            </div>
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

        {/* ── Right Column: Categorized Today's Schedule ── */}
        <aside className={styles.sidePanel}>
          <div className={styles.scheduleHeader}>
            <h2>Today&apos;s Schedule</h2>
            <Link href="/timetable" className={styles.viewAllLink}>View Calendar</Link>
          </div>
          <div className={styles.scheduleDateStrip}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>

          {loadingTimetable ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle} style={{ opacity: 0.5 }}>Loading schedule...</p>
            </div>
          ) : todaySlots.length > 0 ? (
            <div>
              {/* CURRENT ACTIVE SESSION */}
              {categorizedSlots.current && (
                <div className={styles.schedulePhaseGroup}>
                  <p className={styles.schedulePhaseLabel}>
                    <Zap size={12} style={{ color: '#16a34a' }} /> Current Session (Active)
                  </p>
                  {(() => {
                    const slot = categorizedSlots.current;
                    const subName = resolveSubjectName(slot);
                    const durationMins = calculateSlotDuration(slot);
                    return (
                      <div key={slot.id} className={`${styles.recItem} ${styles.recItemActive}`}>
                        <CheckCircle2 size={16} style={{ color: '#d97706' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className={styles.recItemTitle}>{subName}</p>
                          {slot.topic && <p className={styles.recItemTopic} title={slot.topic}>{slot.topic}</p>}
                          <p className={styles.recItemTopic}>
                            {formatSlotTimeRange(slot.startTime, slot.endTime)} · {durationMins}m · active now
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* UPCOMING SESSIONS */}
              {categorizedSlots.upcoming.length > 0 && (
                <div className={styles.schedulePhaseGroup}>
                  <p className={styles.schedulePhaseLabel}>
                    <Clock size={12} style={{ color: 'hsl(var(--primary))' }} /> Upcoming Today ({categorizedSlots.upcoming.length})
                  </p>
                  <div className={styles.recList}>
                    {categorizedSlots.upcoming.map((slot) => {
                      const subName = resolveSubjectName(slot);
                      const durationMins = calculateSlotDuration(slot);
                      return (
                        <div key={slot.id} className={`${styles.recItem} ${styles.recItemUpcoming}`}>
                          <Clock size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className={styles.recItemTitle}>{subName}</p>
                            {slot.topic && <p className={styles.recItemTopic} title={slot.topic}>{slot.topic}</p>}
                            <p className={styles.recItemTopic}>
                              {formatSlotTimeRange(slot.startTime, slot.endTime)} · {durationMins}m · upcoming
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PAST / COMPLETED SESSIONS */}
              {categorizedSlots.past.length > 0 && (
                <div className={styles.schedulePhaseGroup}>
                  <p className={styles.schedulePhaseLabel}>
                    <CheckCircle2 size={12} style={{ color: '#10b981' }} /> Past & Completed ({categorizedSlots.past.length})
                  </p>
                  <div className={styles.recList}>
                    {categorizedSlots.past.map((slot) => {
                      const subName = resolveSubjectName(slot);
                      const durationMins = calculateSlotDuration(slot);
                      const isDone = slot.isCompleted || slot.status === 'completed';
                      return (
                        <div key={slot.id} className={`${styles.recItem} ${isDone ? styles.recItemCompleted : styles.recItemMissed}`}>
                          <CheckCircle2 size={16} style={{ color: isDone ? '#16a34a' : '#dc2626' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className={styles.recItemTitle}>{subName}</p>
                            {slot.topic && <p className={styles.recItemTopic} title={slot.topic}>{slot.topic}</p>}
                            <p className={styles.recItemTopic}>
                              {formatSlotTimeRange(slot.startTime, slot.endTime)} · {durationMins}m · {isDone ? 'completed' : 'missed'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                  + Generate Plan
                </button>
              </Link>
            </div>
          )}

          {/* AI Focus Areas */}
          <div className={styles.aiRecommendations}>
            <div className={styles.recHeader}>
              <Brain size={16} style={{ color: 'hsl(var(--primary))' }} />
              <h2>Focus Areas</h2>
            </div>
            <div className={styles.recList}>
              {loadingPriority ? (
                <p style={{ opacity: 0.5, fontSize: '0.85rem' }}>Loading recommendations...</p>
              ) : priorityList.length > 0 ? (
                priorityList.slice(0, 3).map((item, idx) => (
                  <div key={item.id || idx} className={styles.recItem}>
                    <BookOpen size={16} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className={styles.recItemTitle}>{item.subjectName ?? 'Subject'}</p>
                      <p className={styles.recItemTopic}>
                        {item.averagePercentage != null
                          ? `${Math.round(item.averagePercentage)}% avg · ${item.priorityLevel || 'HIGH'} priority`
                          : `${item.priorityLevel || 'HIGH'} priority`}
                      </p>
                      {item.averagePercentage != null && (
                        <div className={styles.recItemProgressBar}>
                          <div
                            className={styles.recItemProgressFill}
                            style={{ width: `${Math.min(100, Math.round(item.averagePercentage))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.85rem', opacity: 0.6, lineHeight: 1.5 }}>
                  <p>No focus areas yet.</p>
                  <p>Add subjects and record marks to enable AI prioritization.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}


'use client';

import React, { useOptimistic, useState, useTransition, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { timetableApi } from '@/api/timetable.api';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { AppButton } from '@/components/ui/AppButton';
import { TimetableGridSkeleton } from '@/components/skeleton/TimetableGridSkeleton';
import { useToast } from '@/components/ui/ToastProvider';
import {
  CalendarDays,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdaptationResult, AdaptationTrigger, TimetableSlot } from '@/types/api.types';
import { QK } from '@/constants/queryKeys';
import { useAdaptTimetable } from '@/hooks/useTimetable';
import { useSoundPreference } from '@/hooks/useSoundPreference';
import {
  parseSlotDate,
  dayLabel,
  dayKey,
  slotDayKey,
  mondayBasedIndex,
  isFutureSlot,
  formatFutureAvailability,
  evaluateSessionState,
  getSessionState,
} from '@/utils/dateHelpers';
import { SlotDetailModal } from '@/components/timetable/SlotDetailModal';
import styles from './timetable.module.css';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth.api';
import { calcStudyPeriod, ENUM_TO_LABEL } from '@/utils/studyPeriodUtils';
import { fireCelebrationConfetti } from '@/lib/confetti';

function formatTime(value: string): string {
  try {
    return new Date(`1970-01-01T${value}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return value;
  }
}

function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function formatDay(value?: string): string | null {
  if (!value) return null;
  const parsed = parseSlotDate(value);
  return parsed ? parsed.toLocaleDateString([], { day: 'numeric', month: 'short' }) : null;
}

function SubjectProgressCard({ subject, current, target }: { subject: string; current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className={styles.progressCard}>
      <div className={styles.progressHeader}>
        <span className={styles.progressSubject}>{subject}</span>
        <span className={styles.progressRatio}>{current}/{target} sessions</span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DayProgressBar({ slots }: { slots: TimetableSlot[] }) {
  const completed = slots.filter(s => s.status === 'completed').length;
  const total = slots.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={styles.progressBlock} data-testid="today-progress-block">
      <div className={styles.progressHeader}>
        <p className={styles.progressLabel}>Today&apos;s Progress</p>
        <p className={styles.progressValue} data-testid="today-progress-value">
          {completed}/{total} sessions completed
        </p>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Sessions completed today"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SlotCardItem({
  slot,
  now = new Date(),
  onToggle,
  onOpenDetail,
}: {
  slot: TimetableSlot;
  now?: Date;
  onToggle: (id: string, status: TimetableSlot['status']) => void;
  onOpenDetail: (slot: TimetableSlot) => void;
}) {
  const {
    isLocked,
    isMissed,
    isActive,
    isUpcoming,
    isCompleted,
    isCatchUpActive,
  } = evaluateSessionState(slot, now);

  const nextStatus = (current: TimetableSlot['status']): TimetableSlot['status'] =>
    current === 'pending' ? 'completed' : current === 'completed' ? 'pending' : 'completed';

  let statusClass = styles.slotPending;
  if (isCompleted) statusClass = styles.slotCompleted;
  else if (slot.status === 'skipped') statusClass = styles.slotSkipped;
  else if (isLocked) statusClass = styles.slotFuture;
  else if (isActive) statusClass = styles.slotActive;
  else if (isCatchUpActive) statusClass = styles.slotCatchUp;
  else if (isMissed) statusClass = styles.slotMissed;

  const subject = slot.subject?.name || (slot.subject as { name?: string; subjectName?: string })?.subjectName || 'Study';
  const duration = slot.durationMinutes || 60;
  const next = nextStatus(slot.status);

  return (
    <div
      className={`${styles.slotCard} ${statusClass}`}
      onClick={() => onOpenDetail(slot)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(slot);
        }
      }}
      data-testid={`slot-card-${slot.id}`}
      aria-label={`${subject}, ${slot.topic || 'Session'} from ${formatTimeRange(slot.startTime, slot.endTime)}. Status: ${isLocked ? 'locked (future session)' : isMissed ? 'missed' : isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}. Click for details.`}
    >
      {/* 1. Future Locked Badge */}
      {isLocked && !isCompleted && (
        <span className={styles.futureBadge} data-testid={`future-badge-${slot.id}`}>
          <Lock size={10} style={{ marginRight: '0.2rem' }} aria-hidden="true" /> Locked · {formatFutureAvailability(slot.date, now)}
        </span>
      )}

      {/* 2. Catch-up indicator on actionable active/upcoming session on today */}
      {isCatchUpActive && !isCompleted && !isLocked && !isMissed && (
        isActive ? (
          <span className={styles.catchUpActiveBadge} data-testid="catchup-badge">
            ⚡ ACTIVE CATCH-UP
          </span>
        ) : (
          <span className={styles.catchUpBadge} data-testid="catchup-badge">
            📌 CATCH-UP TODAY
          </span>
        )
      )}

      {/* 3. Missed badge (historical uncompleted session or missed execution deadline) */}
      {isMissed && !isCompleted && !isLocked && (
        <span className={styles.missedBadge} data-testid="missed-badge">
          🔴 MISSED
        </span>
      )}

      {/* 4. Active in-progress session badge (standard session) */}
      {isActive && !isCompleted && !isCatchUpActive && (
        <span className={styles.activeBadge} data-testid={`active-badge-${slot.id}`}>
          ⚡ ACTIVE NOW
        </span>
      )}

      <div className={styles.slotHeader}>
        <p className={styles.slotSubject} title={subject}>
          {subject}
        </p>
        <button
          type="button"
          disabled={isLocked}
          onClick={e => {
            e.stopPropagation();
            if (isLocked) return;
            onToggle(slot.id, next);
          }}
          className={`${styles.quickToggleBtn} ${isCompleted ? styles.quickToggleDone : ''} ${isLocked ? styles.quickToggleLocked : ''}`}
          title={isLocked ? `Locked · ${formatFutureAvailability(slot.date, now)}` : `Click to mark as ${next}`}
          aria-label={isLocked ? `Locked: future session` : `Mark session as ${next}`}
          data-testid={`quick-toggle-${slot.id}`}
        >
          {isLocked ? <Lock size={13} /> : isCompleted ? <CheckCircle2 size={14} /> : <Clock size={14} />}
        </button>
      </div>

      {slot.topic && (
        <p className={styles.slotTopic} title={slot.topic} data-testid={`slot-topic-${slot.id}`}>
          📖 {slot.topic}
        </p>
      )}

      <div className={styles.slotFooter}>
        <span className={styles.slotTimeRange} data-testid={`slot-time-${slot.id}`}>
          {formatTimeRange(slot.startTime, slot.endTime)}
        </span>
        <span style={{ opacity: 0.7 }}>{duration}m</span>
      </div>
    </div>
  );
}

function AdaptationSummary({ result }: { result: AdaptationResult }) {
  const changes = result.changes ?? [];
  const horizon =
    result.horizonStart && result.horizonEnd
      ? `${formatDay(result.horizonStart)} – ${formatDay(result.horizonEnd)}`
      : null;

  const stats: string[] = [];
  if (result.missedSessionsRescheduled) stats.push(`${result.missedSessionsRescheduled} missed rescheduled`);
  if (result.slotsCreated) stats.push(`${result.slotsCreated} sessions planned`);
  if (result.slotsPreserved) stats.push(`${result.slotsPreserved} kept as they were`);

  return (
    <div className={`${styles.planPanel} ${result.adapted ? '' : styles.planPanelQuiet}`} role="status">
      <p className={styles.planHeading}>
        {result.adapted ? 'Why the plan changed' : 'No changes needed'}
      </p>
      {result.summary && <p className={styles.planSummary}>{result.summary}</p>}
      {changes.length > 0 && (
        <ul className={styles.planChanges}>
          {changes.map((change, i) => (
            <li key={`${i}-${change}`}>{change}</li>
          ))}
        </ul>
      )}
      {(horizon || stats.length > 0) && (
        <p className={styles.planMeta}>
          {[horizon && `Covering ${horizon}`, ...stats].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}

export default function TimetablePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const { play } = useSoundPreference();
  const adapt = useAdaptTimetable();
  const [plan, setPlan] = useState<AdaptationResult | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [viewAllWeeks, setViewAllWeeks] = useState<boolean>(false);
  
  const storeUser = useAuthStore((s) => s.user);
  const { data: fetchedProfile } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: () => authApi.getMe(),
    staleTime: 1000 * 30,
  });
  const user = fetchedProfile || storeUser;

  const { data: timetable, isLoading, error, refetch } = useQuery({
    queryKey: QK.timetable,
    queryFn: timetableApi.getActive,
  });

  const [optimisticSlots, updateOptimistic] = useOptimistic(
    timetable?.slots ?? [],
    (current: TimetableSlot[], { id, status }: { id: string; status: TimetableSlot['status'] }) =>
      current.map(s => (s.id === id ? { ...s, status } : s))
  );

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => dayKey(today), [today]);

  const slotDay = (slot: TimetableSlot): string | null => slotDayKey(slot.date);

  // Derive distinct calendar days in the active timetable
  const calendarDays = useMemo(() => {
    if (!optimisticSlots.length) return [];
    const dateSet = new Set<string>();
    optimisticSlots.forEach(s => {
      const d = slotDay(s);
      if (d) dateSet.add(d);
    });

    const sorted = Array.from(dateSet).sort();
    if (sorted.length === 0 && timetable?.weekStartDate) {
      // Fallback: 7 days starting from weekStartDate
      const start = parseSlotDate(timetable.weekStartDate) || today;
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return dayKey(d);
      });
    }

    // Ensure contiguous range from first date to last date
    if (sorted.length > 0) {
      const first = parseSlotDate(sorted[0]) || today;
      const last = parseSlotDate(sorted[sorted.length - 1]) || today;
      const totalDays = Math.max(1, Math.round((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      
      const contiguous: string[] = [];
      for (let i = 0; i < totalDays; i++) {
        const curr = new Date(first);
        curr.setDate(first.getDate() + i);
        contiguous.push(dayKey(curr));
      }
      return contiguous;
    }
    return sorted;
  }, [optimisticSlots, timetable, today]);

  // Group days into 7-day calendar weeks
  const weeks = useMemo(() => {
    if (!calendarDays.length) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      chunks.push(calendarDays.slice(i, i + 7));
    }
    return chunks;
  }, [calendarDays]);

  // Determine current active week index
  const activeWeekIndex = useMemo(() => {
    if (!weeks.length) return 0;
    const idx = weeks.findIndex(w => w.includes(todayIso));
    return idx >= 0 ? idx : 0;
  }, [weeks, todayIso]);

  // Horizon range info
  const horizonInfo = useMemo(() => {
    if (!calendarDays.length) return null;
    const firstDate = parseSlotDate(calendarDays[0]);
    const lastDate = parseSlotDate(calendarDays[calendarDays.length - 1]);
    if (!firstDate || !lastDate) return null;

    const startMonth = firstDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const endMonth = lastDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthsLabel = startMonth === endMonth ? startMonth : `${startMonth} – ${endMonth}`;

    const startDateStr = firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDateStr = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const rangeLabel = `${startDateStr} – ${endDateStr}`;

    return {
      months: monthsLabel.toUpperCase(),
      range: rangeLabel,
      totalDays: calendarDays.length,
      totalSessions: optimisticSlots.length,
    };
  }, [calendarDays, optimisticSlots]);

  const todaySlots = optimisticSlots.filter(s => {
    const iso = slotDay(s);
    return iso ? iso === todayIso : s.dayOfWeek === mondayBasedIndex(today);
  });

  /** Missed sessions: past slots not marked completed, or today's session where local time has passed endTime */
  const missedSlots = optimisticSlots.filter(s => getSessionState(s, today) === 'PAST_MISSED');
  const missedIds = new Set(missedSlots.map(s => s.id));

  const handleToggle = (id: string, status: TimetableSlot['status']) => {
    const targetSlot = optimisticSlots.find(s => s.id === id);
    if (targetSlot && getSessionState(targetSlot, today) === 'FUTURE_LOCKED' && status === 'completed') {
      toast.info('Future study sessions cannot be completed early.');
      return;
    }

    // Evidence requirement: if marking completed without approved evidence, open modal to submit proof
    if (status === 'completed' && targetSlot && (!targetSlot.hasEvidence || targetSlot.evidenceStatus !== 'APPROVED')) {
      setSelectedSlot(targetSlot);
      setIsModalOpen(true);
      return;
    }

    const finishesToday =
      status === 'completed' &&
      todaySlots.length > 0 &&
      todaySlots.every(s => s.id === id || s.status === 'completed');

    startTransition(async () => {
      updateOptimistic({ id, status });
      if (selectedSlot && selectedSlot.id === id) {
        setSelectedSlot(prev => (prev ? { ...prev, status, isCompleted: status === 'completed' } : null));
      }
      if (finishesToday) {
        fireCelebrationConfetti();
      }
      try {
        await timetableApi.updateSlotStatus(id, status);
        if (status === 'completed') play(finishesToday ? 'achievement' : 'sessionComplete');
        qc.invalidateQueries({ queryKey: QK.timetable });
        qc.invalidateQueries({ queryKey: QK.timetableInsights });
        qc.invalidateQueries({ queryKey: QK.priority });
        qc.invalidateQueries({ queryKey: QK.readiness });
      } catch (err) {
        console.error('[Timetable] Error updating slot status:', err);
        toast.error('Could not update session status. Please try again.');
        qc.invalidateQueries({ queryKey: QK.timetable });
      }
    });
  };

  const handleOpenDetail = (slot: TimetableSlot) => {
    const { isMissed, isCatchUpActive } = evaluateSessionState(slot, today);
    setSelectedSlot({
      ...slot,
      status: slot.status === 'completed' ? 'completed' : isMissed ? 'missed' : slot.status,
      isCatchUp: isCatchUpActive,
    });
    setIsModalOpen(true);
  };

  const handleReplan = () => {
    const trigger: AdaptationTrigger = missedSlots.length > 0 ? 'MISSED_SESSIONS' : 'MANUAL';
    adapt.mutate(trigger, {
      onSuccess: result => {
        setPlan(result);
        if (result.adapted) toast.success(result.summary ?? 'Your study plan has been updated.');
        else toast.info(result.summary ?? 'Your plan already matches your latest data.');
      },
      onError: err => {
        console.error('[Timetable] Adaptation failed:', err);
        toast.error('Could not re-plan right now. Please try again.');
      },
    });
  };

  if (isLoading) return <div className="p-6"><TimetableGridSkeleton /></div>;
  if (error) return <div className="p-6"><ErrorState message="Could not load timetable." onRetry={refetch} /></div>;

  const currentWeekDays = weeks[selectedWeekIndex] || calendarDays.slice(0, 7);

  return (
    <div className={styles.container}>
      <PageHeader
        title="My Timetable"
        subtitle="Your AI-generated multi-week study schedule. Click any slot to view study topics and guidance."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Timetable' }]}
        action={
          <AppButton leftIcon={<Zap size={16} />} onClick={() => router.push('/timetable/generate')}>
            Generate New
          </AppButton>
        }
      />

      {/* Calendar Horizon & Month Range Header */}
      {horizonInfo && (
        <div className={styles.horizonHeader} data-testid="calendar-horizon-header">
          <div className={styles.horizonInfo}>
            <h2 className={styles.horizonMonths} data-testid="horizon-months-label">
              <CalendarDays size={20} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              {horizonInfo.months}
            </h2>
            <p className={styles.horizonDates} data-testid="horizon-dates-label">
              {horizonInfo.range}
            </p>
          </div>
          <div className={styles.horizonStats}>
            <span className={styles.statPill}>
              {horizonInfo.totalDays} Days Preparation Plan
            </span>
            <span className={styles.statPill}>
              {horizonInfo.totalSessions} Total Sessions
            </span>
          </div>
        </div>
      )}

      {/* Daily study window banner based on user's saved preferences */}
      {timetable && user && (() => {
        const windowEnum = user.preferredStudyTime ?? 'EVENING';
        const hours = user.availableHoursPerDay ?? 2;
        const period = calcStudyPeriod(windowEnum, hours);
        const startLabel = ENUM_TO_LABEL[windowEnum] ?? '5:00 PM';
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(0, 229, 192, 0.05)',
              border: '1px solid rgba(0, 229, 192, 0.2)',
              borderLeft: '3px solid var(--color-primary)',
              fontSize: '0.8125rem',
              color: 'var(--color-muted-foreground)',
              marginBottom: '1rem',
            }}
            data-testid="study-window-banner"
          >
            <Clock size={14} style={{ flexShrink: 0, color: 'var(--color-primary)' }} aria-hidden="true" />
            <span>
              {`Your daily study window: `}
              <strong style={{ color: 'var(--color-foreground)' }} data-testid="timetable-study-window-value">
                <span data-testid="study-window-range">{period.label}</span>
              </strong>
              <span data-testid="study-window-meta">{` · Based on your saved preferences (${startLabel} start, ${hours}h/day). `}</span>
              <a
                href="/settings"
                style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
              >
                Change in Settings
              </a>
            </span>
          </div>
        );
      })()}

      {!timetable || !optimisticSlots.length ? (
        <EmptyState
          icon={CalendarDays}
          message="No active timetable. Generate an AI-powered study plan to get started!"
          action={{ label: 'Generate Timetable', onClick: () => router.push('/timetable/generate') }}
        />
      ) : (
        <>
          {/* Missed Sessions Urgent Alert Banner */}
          {missedSlots.length > 0 && (
            <div className={styles.missedAlertBanner} data-testid="missed-sessions-alert-banner">
              <div className={styles.missedAlertContent}>
                <AlertTriangle size={20} className={styles.missedAlertIcon} aria-hidden="true" />
                <div>
                  <strong style={{ color: '#ef4444' }}>🔴 MISSED SESSIONS REQUIRE ATTENTION:</strong>{' '}
                  You have {missedSlots.length} session{missedSlots.length === 1 ? '' : 's'} from past days that were not completed.
                  Catch-up has been prioritized for today.
                </div>
              </div>
              <AppButton
                size="sm"
                variant="primary"
                leftIcon={<RefreshCw size={14} />}
                loading={adapt.isPending}
                onClick={handleReplan}
                data-testid="replan-missed-btn"
              >
                Re-plan with Adaptive AI
              </AppButton>
            </div>
          )}

          {todaySlots.length > 0 && <DayProgressBar slots={todaySlots} />}

          {/* Adaptive Plan Section */}
          <section className={styles.adaptBlock} aria-labelledby="timetable-adapt-heading">
            <div className={styles.adaptRow}>
              <span
                className={`${styles.adaptIcon} ${missedSlots.length > 0 ? styles.adaptIconAlert : ''}`}
                aria-hidden="true"
              >
                {missedSlots.length > 0 ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
              </span>
              <div className={styles.adaptText}>
                <h2 id="timetable-adapt-heading" className={styles.adaptTitle}>
                  {missedSlots.length > 0 ? 'You have catching up to do' : 'Adaptive plan'}
                </h2>
                <p className={styles.adaptSubtitle}>
                  {missedSlots.length > 0
                    ? `${missedSlots.length} session${missedSlots.length === 1 ? '' : 's'} passed without being marked done. Re-planning fits ${missedSlots.length === 1 ? 'it' : 'them'} back into your preferred study hours before your exams.`
                    : 'Rebuild the days ahead from your latest marks, uploaded material and exam dates. Sessions you have already finished stay untouched.'}
                </p>
              </div>
              <AppButton
                variant={missedSlots.length > 0 ? 'primary' : 'outline'}
                leftIcon={<RefreshCw size={16} />}
                loading={adapt.isPending}
                onClick={handleReplan}
                data-testid="replan-main-btn"
              >
                {adapt.isPending ? 'Re-planning…' : 'Re-plan upcoming days'}
              </AppButton>
            </div>

            {plan && <AdaptationSummary result={plan} />}
          </section>

          {/* Week Switcher & Multi-Week Controls */}
          {weeks.length > 1 && (
            <div className={styles.weekNavBlock} data-testid="week-navigation-block">
              <div className={styles.weekPager}>
                <AppButton
                  size="sm"
                  variant="outline"
                  leftIcon={<ChevronLeft size={14} />}
                  disabled={selectedWeekIndex === 0 || viewAllWeeks}
                  onClick={() => setSelectedWeekIndex(prev => Math.max(0, prev - 1))}
                  data-testid="prev-week-btn"
                >
                  Prev
                </AppButton>

                <div className={styles.weekTitle} data-testid="current-week-title">
                  {viewAllWeeks
                    ? `All ${weeks.length} Weeks View`
                    : `Week ${selectedWeekIndex + 1} of ${weeks.length} (${formatDay(currentWeekDays[0])} – ${formatDay(currentWeekDays[currentWeekDays.length - 1])})`}
                </div>

                <AppButton
                  size="sm"
                  variant="outline"
                  rightIcon={<ChevronRight size={14} />}
                  disabled={selectedWeekIndex === weeks.length - 1 || viewAllWeeks}
                  onClick={() => setSelectedWeekIndex(prev => Math.min(weeks.length - 1, prev + 1))}
                  data-testid="next-week-btn"
                >
                  Next
                </AppButton>
              </div>

              {/* Quick Jump Tabs */}
              <div className={styles.quickJumpTabs}>
                <button
                  type="button"
                  className={`${styles.quickTab} ${!viewAllWeeks && selectedWeekIndex === activeWeekIndex ? styles.quickTabActive : ''}`}
                  onClick={() => {
                    setViewAllWeeks(false);
                    setSelectedWeekIndex(activeWeekIndex);
                  }}
                  data-testid="quick-jump-today"
                >
                  Today
                </button>
                {weeks.map((_, wIdx) => (
                  <button
                    key={wIdx}
                    type="button"
                    className={`${styles.quickTab} ${!viewAllWeeks && selectedWeekIndex === wIdx ? styles.quickTabActive : ''}`}
                    onClick={() => {
                      setViewAllWeeks(false);
                      setSelectedWeekIndex(wIdx);
                    }}
                    data-testid={`quick-jump-week-${wIdx + 1}`}
                  >
                    Week {wIdx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.quickTab} ${viewAllWeeks ? styles.quickTabActive : ''}`}
                  onClick={() => setViewAllWeeks(prev => !prev)}
                  data-testid="quick-jump-all-weeks"
                >
                  {viewAllWeeks ? 'Single Week View' : 'All Weeks View'}
                </button>
              </div>
            </div>
          )}

          {/* Calendar Grid Rendering */}
          {(viewAllWeeks ? weeks : [currentWeekDays]).map((weekDaysList, wIndex) => {
            const firstDayParsed = parseSlotDate(weekDaysList[0]);
            const weekMonth = firstDayParsed ? firstDayParsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() : '';

            return (
              <div key={wIndex} className={styles.gridBlock} style={{ marginBottom: '1.5rem' }}>
                {viewAllWeeks && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                      Week {wIndex + 1} · {weekMonth}
                    </h3>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>
                      {formatDay(weekDaysList[0])} – {formatDay(weekDaysList[weekDaysList.length - 1])}
                    </span>
                  </div>
                )}

                <div className={styles.gridHeaders}>
                  {weekDaysList.map((dayIsoStr, dIdx) => {
                    const parsedDate = parseSlotDate(dayIsoStr);
                    const isToday = dayIsoStr === todayIso;
                    const weekday = parsedDate ? dayLabel(parsedDate) : `Day ${dIdx + 1}`;
                    const dayNum = parsedDate ? parsedDate.getDate() : dIdx + 1;
                    const monthShort = parsedDate ? parsedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';

                    return (
                      <div
                        key={dayIsoStr}
                        className={`${styles.dayHeader} ${isToday ? styles.dayHeaderActive : ''}`}
                        data-testid={`day-header-${dayIsoStr}`}
                      >
                        <span className={styles.dayHeaderMonthTag}>{monthShort}</span>
                        <span className={styles.dayHeaderWeekday}>{weekday}</span>
                        <span className={styles.dayHeaderDate}>{dayNum}</span>
                        {isToday && <span className={styles.todayDot} title="Today" />}
                      </div>
                    );
                  })}
                </div>

                <div className={styles.gridColumns}>
                  {weekDaysList.map(dayIsoStr => {
                    const daySlots = optimisticSlots.filter(s => {
                      const d = slotDay(s);
                      return d ? d === dayIsoStr : false;
                    });

                    return (
                      <div key={dayIsoStr} className={styles.dayColumn} data-testid={`day-column-${dayIsoStr}`}>
                        {daySlots.length === 0 ? (
                          <div className={styles.emptyDayText}>Rest / Review</div>
                        ) : (
                          daySlots.map(slot => (
                            <SlotCardItem
                              key={slot.id}
                              slot={slot}
                              now={today}
                              onToggle={handleToggle}
                              onOpenDetail={handleOpenDetail}
                            />
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Study Session Detail Modal */}
      <SlotDetailModal
        slot={selectedSlot}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onToggleStatus={handleToggle}
      />
    </div>
  );
}

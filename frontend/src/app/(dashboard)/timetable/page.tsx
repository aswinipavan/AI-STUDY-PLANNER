'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
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
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdaptationResult, AdaptationTrigger, TimetableSlot } from '@/types/api.types';
import { QK } from '@/constants/queryKeys';
import { useAdaptTimetable } from '@/hooks/useTimetable';
import { useSoundPreference } from '@/hooks/useSoundPreference';
import { parseSlotDate, dayLabel, dayKey, slotDayKey, mondayBasedIndex } from '@/utils/dateHelpers';
import styles from './timetable.module.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTime(value: string): string {
  return new Date(`1970-01-01T${value}`).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDay(value?: string): string | null {
  if (!value) return null;
  const parsed = parseSlotDate(value);
  return parsed ? parsed.toLocaleDateString([], { day: 'numeric', month: 'short' }) : null;
}

function DayProgressBar({ slots }: { slots: TimetableSlot[] }) {
  const completed = slots.filter(s => s.status === 'completed').length;
  const total = slots.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={styles.progressBlock}>
      <div className={styles.progressHeader}>
        <p className={styles.progressLabel}>Today&apos;s Progress</p>
        <p className={styles.progressValue}>{completed}/{total} sessions</p>
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

function SlotCard({
  slot,
  isMissed,
  onToggle,
}: {
  slot: TimetableSlot;
  isMissed: boolean;
  onToggle: (id: string, status: TimetableSlot['status']) => void;
}) {
  const nextStatus = (current: TimetableSlot['status']): TimetableSlot['status'] =>
    current === 'pending' ? 'completed' : current === 'completed' ? 'skipped' : 'pending';

  let statusClass = styles.slotPending;
  if (slot.status === 'completed') statusClass = styles.slotCompleted;
  else if (slot.status === 'skipped') statusClass = styles.slotSkipped;
  else if (isMissed) statusClass = styles.slotMissed;

  const next = nextStatus(slot.status);
  const subject = slot.subject?.name ?? 'Study';

  return (
    <button
      onClick={() => onToggle(slot.id, next)}
      className={`${styles.slotCard} ${statusClass}`}
      title={`Click to mark as ${next}`}
      aria-label={
        `${subject}${slot.topic ? `, ${slot.topic}` : ''} at ${formatTime(slot.startTime)} — ` +
        `${isMissed ? 'missed' : slot.status}. Activate to mark as ${next}.`
      }
    >
      <div className={styles.slotHeader}>
        <p className={styles.slotSubject}>{subject}</p>
        <span className={styles.slotIcon} aria-hidden="true">
          {slot.status === 'completed' ? (
            <CheckCircle2 size={14} />
          ) : slot.status === 'skipped' ? (
            <XCircle size={14} />
          ) : isMissed ? (
            <AlertTriangle size={14} />
          ) : (
            <Clock size={14} />
          )}
        </span>
      </div>
      {slot.topic && (
        <p className={styles.slotTopic} title={slot.topic}>
          {slot.topic}
        </p>
      )}
      <p className={styles.slotTime}>{formatTime(slot.startTime)}</p>
    </button>
  );
}

/**
 * The "why the plan changed" panel (§ adaptive AI).
 *
 * The reasons are the backend's own `changes[]`, rendered verbatim — the service
 * knows which subject moved and why (exam pulled closer, coverage complete, a
 * missed session pushed forward), so restating it in the client would only give
 * the two places a chance to disagree.
 */
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

  const { data: timetable, isLoading, error, refetch } = useQuery({
    queryKey: QK.timetable,
    queryFn: timetableApi.getActive,
  });

  const [optimisticSlots, updateOptimistic] = useOptimistic(
    timetable?.slots ?? [],
    (current: TimetableSlot[], { id, status }: { id: string; status: TimetableSlot['status'] }) =>
      current.map(s => (s.id === id ? { ...s, status } : s))
  );

  const today = new Date();
  const todayKey = dayLabel(today);
  const todayIso = dayKey(today);
  const todayIndex = mondayBasedIndex(today);

  const slotDay = (slot: TimetableSlot): string | null => slotDayKey(slot.date);

  const todaySlots = optimisticSlots.filter(s => {
    const iso = slotDay(s);
    return iso ? iso === todayIso : s.dayOfWeek === todayIndex;
  });

  /** Still pending on a day that has already passed — nothing else can mean this. */
  const missedSlots = optimisticSlots.filter(s => {
    if (s.status !== 'pending') return false;
    const iso = slotDay(s);
    return iso !== null && iso < todayIso;
  });
  const missedIds = new Set(missedSlots.map(s => s.id));

  const handleToggle = (id: string, status: TimetableSlot['status']) => {
    // Clearing the last open session of the day is the one genuine milestone the
    // existing data can prove, so it gets the achievement cue instead of the
    // per-session one. Computed before the await so it describes this click.
    const finishesToday =
      status === 'completed' &&
      todaySlots.length > 1 &&
      todaySlots.every(s => s.id === id || s.status !== 'pending');

    startTransition(async () => {
      updateOptimistic({ id, status });
      try {
        await timetableApi.updateSlotStatus(id, status);
        if (status === 'completed') play(finishesToday ? 'achievement' : 'sessionComplete');
        qc.invalidateQueries({ queryKey: QK.timetable });
        // Finishing (or skipping) a session moves coverage, consistency and
        // therefore priority. Refresh those reads rather than silently re-planning
        // the schedule the student is currently looking at — re-planning stays an
        // explicit action.
        qc.invalidateQueries({ queryKey: QK.timetableInsights });
        qc.invalidateQueries({ queryKey: QK.priority });
        qc.invalidateQueries({ queryKey: QK.readiness });
      } catch (err) {
        // BUG-006 Fixed: show visible error toast instead of swallowing silently
        console.error('[Timetable] Error updating slot status:', err);
        toast.error('Could not update session status. Please try again.');
        qc.invalidateQueries({ queryKey: QK.timetable }); // revert optimistic update
      }
    });
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

  return (
    <div className={styles.container}>
      <PageHeader
        title="My Timetable"
        subtitle="Your AI-generated weekly study schedule. Click any slot to mark it done."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Timetable' }]}
        action={
          <AppButton leftIcon={<Zap size={16} />} onClick={() => router.push('/timetable/generate')}>
            Generate New
          </AppButton>
        }
      />

      {!timetable || !optimisticSlots.length ? (
        <EmptyState
          icon={CalendarDays}
          message="No active timetable. Generate an AI-powered study plan to get started!"
          action={{ label: 'Generate Timetable', onClick: () => router.push('/timetable/generate') }}
        />
      ) : (
        <>
          {todaySlots.length > 0 && <DayProgressBar slots={todaySlots} />}

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
              >
                {adapt.isPending ? 'Re-planning…' : 'Re-plan upcoming days'}
              </AppButton>
            </div>

            {plan && <AdaptationSummary result={plan} />}
          </section>

          <div className={styles.gridBlock}>
            <div className={styles.gridHeaders}>
              {DAYS.map(day => (
                <div
                  key={day}
                  className={`${styles.dayHeader} ${day === todayKey ? styles.dayHeaderActive : ''}`}
                >
                  {day}
                  {day === todayKey && <span className={styles.todayDot} />}
                </div>
              ))}
            </div>

            <div className={styles.gridColumns}>
              {DAYS.map((day, dayIndex) => {
                const daySlots = optimisticSlots.filter(s => {
                  if (s.date) {
                    const parsed = parseSlotDate(s.date);
                    return parsed ? dayLabel(parsed) === day : false;
                  }
                  if (s.dayOfWeek !== undefined && s.dayOfWeek !== null) {
                    return s.dayOfWeek === dayIndex;
                  }
                  return false;
                });
                return (
                  <div key={day} className={styles.dayColumn}>
                    {daySlots.map(slot => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        isMissed={missedIds.has(slot.id)}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

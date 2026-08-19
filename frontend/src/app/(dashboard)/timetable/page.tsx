'use client';

import React, { useOptimistic, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { timetableApi } from '@/api/timetable.api';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { AppButton } from '@/components/ui/AppButton';
import { TimetableGridSkeleton } from '@/components/skeleton/TimetableGridSkeleton';
import { useToast } from '@/components/ui/ToastProvider';
import { CalendarDays, Zap, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TimetableSlot } from '@/types/api.types';
import { QK } from '@/constants/queryKeys';
import styles from './timetable.module.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SlotCard({ slot, onToggle }: { slot: TimetableSlot; onToggle: (id: string, status: TimetableSlot['status']) => void }) {
  const nextStatus = (current: TimetableSlot['status']): TimetableSlot['status'] =>
    current === 'pending' ? 'completed' : current === 'completed' ? 'skipped' : 'pending';

  let statusClass = styles.slotPending;
  if (slot.status === 'completed') statusClass = styles.slotCompleted;
  if (slot.status === 'skipped') statusClass = styles.slotSkipped;

  return (
    <button
      onClick={() => onToggle(slot.id, nextStatus(slot.status))}
      className={`${styles.slotCard} ${statusClass}`}
      title={`Click to mark as ${nextStatus(slot.status)}`}
    >
      <div className={styles.slotHeader}>
        <p className={styles.slotSubject}>{slot.subject?.name ?? 'Study'}</p>
        <span className={styles.slotIcon}>
          {slot.status === 'completed'
            ? <CheckCircle2 size={14} />
            : slot.status === 'skipped'
            ? <XCircle size={14} />
            : <Clock size={14} />}
        </span>
      </div>
      {slot.topic && (
        <p className={styles.slotTopic} title={slot.topic}>
          {slot.topic}
        </p>
      )}
      <p className={styles.slotTime}>
        {new Date(`1970-01-01T${slot.startTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </button>
  );
}

export default function TimetablePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const { data: timetable, isLoading, error, refetch } = useQuery({
    queryKey: QK.timetable,
    queryFn: timetableApi.getActive,
  });

  const [optimisticSlots, updateOptimistic] = useOptimistic(
    timetable?.slots ?? [],
    (current: TimetableSlot[], { id, status }: { id: string; status: TimetableSlot['status'] }) =>
      current.map(s => (s.id === id ? { ...s, status } : s))
  );

  const handleToggle = (id: string, status: TimetableSlot['status']) => {
    startTransition(async () => {
      updateOptimistic({ id, status });
      try {
        await timetableApi.updateSlotStatus(id, status);
        qc.invalidateQueries({ queryKey: QK.timetable });
      } catch (err) {
        // BUG-006 Fixed: show visible error toast instead of swallowing silently
        console.error('[Timetable] Error updating slot status:', err);
        toast.error('Could not update session status. Please try again.');
        qc.invalidateQueries({ queryKey: QK.timetable }); // revert optimistic update
      }
    });
  };

  const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const todayIndex = (new Date().getDay() + 6) % 7;
  const todaySlots = optimisticSlots.filter(s =>
    (s.date && new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }) === todayKey) || s.dayOfWeek === todayIndex
  );

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
                    return new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }) === day;
                  }
                  if (s.dayOfWeek !== undefined && s.dayOfWeek !== null) {
                    return s.dayOfWeek === dayIndex;
                  }
                  return false;
                });
                return (
                  <div key={day} className={styles.dayColumn}>
                    {daySlots.map(slot => (
                      <SlotCard key={slot.id} slot={slot} onToggle={handleToggle} />
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

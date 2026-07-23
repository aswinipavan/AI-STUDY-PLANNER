'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examsApi } from '@/api/exams.api';
import { QK } from '@/constants/queryKeys';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ExamModal } from '@/components/exams/ExamModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { AppButton } from '@/components/ui/AppButton';
import { CalendarDays, Plus, Trash2, Clock } from 'lucide-react';
import { Exam } from '@/types/api.types';
import styles from './exams.module.css';

function getDaysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const difficultyClasses: Record<string, string> = {
  easy: styles.diffEasy,
  medium: styles.diffMedium,
  hard: styles.diffHard,
};

export default function ExamsPage() {
  const qc = useQueryClient();
  const [slideOpen, setSlideOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);

  const { data: exams, isLoading, error, refetch } = useQuery({
    queryKey: QK.exams,
    queryFn: examsApi.getUpcoming,
  });

  const { mutate: deleteExam } = useMutation({
    mutationFn: (id: string) => examsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.exams }),
  });

  if (isLoading) return (
    <div className={`${styles.container} ${styles.skeletonList}`}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  );

  if (error) return <div className="p-6"><ErrorState message="Could not load exams." onRetry={refetch} /></div>;

  return (
    <div className={styles.container}>
      <PageHeader
        title="Upcoming Exams"
        subtitle="Track your exam schedule and stay prepared."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Exams' }]}
        action={
          <AppButton leftIcon={<Plus size={16} />} onClick={() => setSlideOpen(true)}>
            Add Exam
          </AppButton>
        }
      />

      {!exams?.length ? (
        <EmptyState
          icon={CalendarDays}
          message="No upcoming exams. Add your first exam to start tracking!"
          action={{ label: 'Add Exam', onClick: () => setSlideOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {exams.map((exam, index) => {
            const days = getDaysUntil(exam.examDate);
            const isToday = days === 0;
            const diffClass = difficultyClasses[exam.difficulty] || styles.diffMedium;
            
            return (
              <div key={exam.id} className={styles.card} style={{ animationDelay: `${index * 50}ms` }}>
                <div className={styles.leftContent}>
                  <div className={styles.dateBlock}>
                    <span className={styles.dateDay}>{new Date(exam.examDate).getDate()}</span>
                    <span className={styles.dateMonth}>{new Date(exam.examDate).toLocaleString('default', { month: 'short' })}</span>
                  </div>
                  <div className={styles.infoBlock}>
                    <p className={styles.subjectName}>{exam.subject?.name ?? 'Exam'}</p>
                    <div className={styles.metaTags}>
                      <span className={`${styles.difficultyTag} ${diffClass}`}>
                        {exam.difficulty}
                      </span>
                      <span className={`${styles.countdown} ${isToday ? styles.countdownToday : ''}`}>
                        <Clock size={12} />
                        {days > 0 ? `in ${days} day${days !== 1 ? 's' : ''}` : days === 0 ? 'Today!' : 'Past'}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setDeleteTarget(exam)} 
                  className={styles.btnDelete}
                  aria-label="Delete exam"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ExamModal
        isOpen={slideOpen}
        onClose={() => setSlideOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteExam(deleteTarget.id)}
        title="Delete Exam"
        message={`Remove this exam from your schedule? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
      />
    </div>
  );
}

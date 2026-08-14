'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsApi } from '@/api/subjects.api';
import { QK } from '@/constants/queryKeys';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SubjectModal } from '@/components/subjects/SubjectModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { AppButton } from '@/components/ui/AppButton';
import { BookOpen, Plus, Trash2, Pencil, Clock, Calendar } from 'lucide-react';
import { Subject } from '@/types/api.types';
import styles from './subjects.module.css';

export default function SubjectsPage() {
  const qc = useQueryClient();
  const [slideOpen, setSlideOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const openAdd = () => { setEditTarget(null); setSlideOpen(true); };
  const openEdit = (s: Subject) => { setEditTarget(s); setSlideOpen(true); };

  const { data: subjects, isLoading, error, refetch } = useQuery({
    queryKey: QK.subjects,
    queryFn: subjectsApi.getAll,
  });

  const { mutate: deleteSubject } = useMutation({
    mutationFn: (id: string) => subjectsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.subjects }),
  });

  if (isLoading) return (
    <div className={`${styles.container} ${styles.skeletonList}`}>
      <div className={styles.skeletonHeader} />
      <div className={styles.grid}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    </div>
  );

  if (error) return <div className="p-6"><ErrorState message="Could not load subjects." onRetry={refetch} /></div>;

  return (
    <div className={styles.container}>
      <PageHeader
        title="My Subjects"
        subtitle="Manage all your study subjects in one place."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Subjects' }]}
        action={
          <AppButton leftIcon={<Plus size={16} />} onClick={openAdd}>
            Add Subject
          </AppButton>
        }
      />

      {!subjects?.length ? (
        <EmptyState
          icon={BookOpen}
          message="Add your first subject to start building your study plan!"
          action={{ label: 'Add Subject', onClick: openAdd }}
        />
      ) : (
        <div className={styles.grid}>
          {subjects.map((subject, index) => (
            <div
              key={subject.id}
              className={styles.card}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div 
                className={styles.cardColorStrip} 
                style={{ backgroundColor: subject.color || 'hsl(var(--primary))' }} 
              />
              <div className={styles.cardHeader}>
                <p className={styles.subjectName}>{subject.name}</p>
                <div className={styles.actions}>
                  <button 
                    onClick={() => openEdit(subject)} 
                    className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                    aria-label="Edit subject"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    onClick={() => setDeleteTarget(subject)} 
                    className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                    aria-label="Delete subject"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className={styles.cardFooter}>
                {subject.targetHours && (
                  <p className={styles.targetInfo}>
                    <Clock size={12} />
                    {subject.targetHours}h target
                  </p>
                )}
                {subject.daysUntilExam !== undefined && subject.daysUntilExam !== null && (
                  <p className={`${styles.targetInfo} ${subject.daysUntilExam <= 3 ? styles.urgentDeadline : subject.daysUntilExam <= 7 ? styles.warningDeadline : ''}`}>
                    <Calendar size={12} />
                    {subject.daysUntilExam === 0 ? 'Exam today!' : `Exam in ${subject.daysUntilExam} days`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SubjectModal
        isOpen={slideOpen}
        onClose={() => setSlideOpen(false)}
        editSubject={editTarget}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteSubject(deleteTarget.id)}
        title="Delete Subject"
        message={`Delete "${deleteTarget?.name}"? All associated data will be removed.`}
        variant="danger"
        confirmLabel="Delete"
      />
    </div>
  );
}

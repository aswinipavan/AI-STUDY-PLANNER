'use client';

import React from 'react';
import { usePriority } from '@/hooks/usePerformance';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { AlertTriangle } from 'lucide-react';
import styles from './priority.module.css';

export default function PriorityPage() {
  const { data: priorities, isLoading, error, refetch } = usePriority();

  if (isLoading) return (
    <div className={styles.container}>
      <PageHeader
        title="Subject Priority"
        subtitle="Subjects ranked by urgency — focus on the top ones first."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Priority' }]}
      />
      <div className={styles.skeletonList}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    </div>
  );

  if (error) return <div className="p-6"><ErrorState message="Could not load priority data." onRetry={refetch} /></div>;

  const list = Array.isArray(priorities) ? priorities : [];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Subject Priority"
        subtitle="Subjects ranked by urgency — focus on the top ones first."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Priority' }]}
      />

      <div className={styles.list}>
        {list.map((item: { subjectId: string; subjectName?: string; priority: number; averageScore?: number }, idx: number) => {
          const pct = Math.round(item.averageScore ?? 0);
          
          let cardClass = styles.itemCard;
          if (idx === 0) cardClass += ` ${styles.itemUrgent0}`;
          else if (idx === 1) cardClass += ` ${styles.itemUrgent1}`;

          let rankClass = styles.rankBadge;
          if (idx === 0) rankClass += ` ${styles.rank0}`;
          else if (idx === 1) rankClass += ` ${styles.rank1}`;
          else rankClass += ` ${styles.rankRest}`;

          const ringColor = idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : '#00e5c0';

          return (
            <div key={item.subjectId} className={cardClass} style={{ animationDelay: `${idx * 100}ms` }}>
              <div className={styles.leftCol}>
                <span className={rankClass}>#{idx + 1}</span>
                <div>
                  <h3 className={styles.subjectName}>{item.subjectName}</h3>
                  {idx < 2 && (
                    <p className={styles.alertMsg}>
                      <AlertTriangle size={14} />
                      Needs urgent attention
                    </p>
                  )}
                </div>
              </div>
              <ProgressRing percentage={pct} size={64} strokeWidth={6} color={ringColor} label="avg" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

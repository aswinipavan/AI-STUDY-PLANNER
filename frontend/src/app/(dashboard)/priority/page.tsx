'use client';

import React from 'react';
import { usePriority } from '@/hooks/usePerformance';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { SubjectPriority } from '@/types/api.types';
import { Clock, Info } from 'lucide-react';
import styles from './priority.module.css';

export default function PriorityPage() {
  const { data: priorities, isLoading, error, refetch } = usePriority();

  if (isLoading) return (
    <div className={styles.container}>
      <PageHeader
        title="Subject Priority"
        subtitle="Explainable AI rankings — understand exactly why each subject is prioritized."
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

  const list: SubjectPriority[] = Array.isArray(priorities) ? (priorities as unknown as SubjectPriority[]) : [];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Subject Priority"
        subtitle="Explainable AI rankings — understand exactly why each subject is prioritized."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Priority' }]}
      />

      <div className={styles.list}>
        {list.map((item, idx) => {
          const pct = Math.round(item.averagePercentage ?? 0);
          const score = item.priorityScore ?? Math.max(10, 100 - pct);
          const level = item.priorityLevel || (score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW');
          
          let cardClass = styles.itemCard;
          if (level === 'HIGH') cardClass += ` ${styles.itemUrgent0}`;
          else if (level === 'MEDIUM') cardClass += ` ${styles.itemUrgent1}`;

          let rankClass = styles.rankBadge;
          if (idx === 0) rankClass += ` ${styles.rank0}`;
          else if (idx === 1) rankClass += ` ${styles.rank1}`;
          else rankClass += ` ${styles.rankRest}`;

          const ringColor = level === 'HIGH' ? '#ef4444' : level === 'MEDIUM' ? '#f59e0b' : '#00e5c0';
          const badgeClass = level === 'HIGH' ? styles.priorityHigh : level === 'MEDIUM' ? styles.priorityMed : styles.priorityLow;

          return (
            <div key={item.id || idx} className={cardClass} style={{ animationDelay: `${idx * 100}ms` }}>
              <div className={styles.leftCol}>
                <span className={rankClass}>#{idx + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 className={styles.subjectName}>{item.subjectName}</h3>
                    <span className={`${styles.priorityScoreBadge} ${badgeClass}`}>
                      {level} PRIORITY • Score: {score}/100
                    </span>
                  </div>

                  {/* Explainable Reasons */}
                  {item.reasons && item.reasons.length > 0 && (
                    <div className={styles.reasonsList}>
                      {item.reasons.map((reason, rIdx) => (
                        <span key={rIdx} className={styles.reasonItem}>
                          <Info size={12} style={{ flexShrink: 0, color: ringColor }} />
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Recommended Study Duration */}
                  {item.recommendedStudyTime && (
                    <div className={styles.studyTimeBadge}>
                      <Clock size={11} />
                      Recommended: {item.recommendedStudyTime} daily
                    </div>
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


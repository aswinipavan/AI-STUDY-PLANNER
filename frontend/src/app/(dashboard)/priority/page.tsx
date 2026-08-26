'use client';

import React from 'react';
import { usePriority } from '@/hooks/usePerformance';
import { useTimetableInsights } from '@/hooks/useTimetable';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { SubjectPriority, SubjectReadiness } from '@/types/api.types';
import { Clock, Info, Layers, Target } from 'lucide-react';
import styles from './priority.module.css';

/**
 * The planner's own stage names, in the student's words. Which stage a subject is
 * in is decided by the backend from real coverage, marks and exam distance — this
 * map only relabels it, so the two can't disagree about the ranking.
 */
const STAGE_LABEL: Record<string, string> = {
  LEARNING: 'Learning new topics',
  REVISION: 'Spaced revision',
  PRACTICE: 'Applied practice',
  WEAK_AREA: 'Weak-area reinforcement',
  FINAL_PREP: 'Final exam preparation',
};

function SubjectStage({ signals }: { signals: SubjectReadiness }) {
  const total = signals.totalTopics ?? 0;
  const covered = signals.coveredTopics ?? 0;
  const stage = signals.stage ? STAGE_LABEL[signals.stage] : undefined;

  // No uploaded material yet means no topics to report on — say nothing rather
  // than showing a 0% bar that looks like a failure.
  if (!stage && total === 0) return null;

  const pct = total > 0 ? Math.min(100, Math.round((covered / total) * 100)) : 0;

  return (
    <div className={styles.stageBlock}>
      {stage && (
        <span className={styles.stageBadge}>
          <Target size={11} aria-hidden="true" />
          {stage}
        </span>
      )}
      {total > 0 && (
        <div className={styles.coverageRow}>
          <span className={styles.coverageLabel}>
            <Layers size={11} aria-hidden="true" />
            {covered} of {total} topics from your material
          </span>
          <div
            className={styles.coverageTrack}
            role="progressbar"
            aria-label={`Material covered for ${signals.subjectName}`}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={styles.coverageFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PriorityPage() {
  const { data: priorities, isLoading, error, refetch } = usePriority();
  // Supplementary: the ranking renders without it, so a slow or failed insights
  // call degrades to the list the page has always shown.
  const { data: insights } = useTimetableInsights();

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
  const signalsById = new Map<string, SubjectReadiness>(
    (insights ?? []).filter(s => s.subjectId).map(s => [s.subjectId, s])
  );

  return (
    <div className={styles.container}>
      <PageHeader
        title="Subject Priority"
        subtitle="Explainable AI rankings — understand exactly why each subject is prioritized."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Priority' }]}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Target}
          message="No subjects to rank yet. Add your subjects and marks, and the planner will explain what to study first."
        />
      ) : (
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
            const signals = signalsById.get(item.id);

            return (
              <div key={item.id || idx} className={cardClass} style={{ animationDelay: `${idx * 100}ms` }}>
                <div className={styles.leftCol}>
                  <span className={rankClass}>#{idx + 1}</span>
                  <div className={styles.leftBody}>
                    <div className={styles.titleRow}>
                      <h3 className={styles.subjectName}>{item.subjectName}</h3>
                      <span className={`${styles.priorityScoreBadge} ${badgeClass}`}>
                        {level} PRIORITY • Score: {score}/100
                      </span>
                    </div>

                    {/* What the planner is doing with this subject right now */}
                    {signals && <SubjectStage signals={signals} />}

                    {/* Explainable Reasons */}
                    {item.reasons && item.reasons.length > 0 && (
                      <div className={styles.reasonsList}>
                        {item.reasons.map((reason, rIdx) => (
                          <span key={rIdx} className={styles.reasonItem}>
                            <Info size={12} style={{ flexShrink: 0, color: ringColor }} aria-hidden="true" />
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Recommended Study Duration */}
                    {item.recommendedStudyTime && (
                      <div className={styles.studyTimeBadge}>
                        <Clock size={11} aria-hidden="true" />
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
      )}
    </div>
  );
}

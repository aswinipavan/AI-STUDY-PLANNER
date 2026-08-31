'use client';

import React, { useEffect } from 'react';
import {
  X,
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  Sparkles,
  Zap,
  Lock,
} from 'lucide-react';
import { TimetableSlot } from '@/types/api.types';
import { parseSlotDate, isFutureSlot } from '@/utils/dateHelpers';
import { AppButton } from '@/components/ui/AppButton';
import styles from './slotDetailModal.module.css';

interface SlotDetailModalProps {
  slot: TimetableSlot | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus: (id: string, status: TimetableSlot['status']) => void;
}

function formatFullDate(value?: string): string {
  if (!value) return 'Scheduled Study Session';
  const parsed = parseSlotDate(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

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

export const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
  slot,
  isOpen,
  onClose,
  onToggleStatus,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !slot) return null;

  const subjectName = slot.subject?.name || 'Study Session';
  const isCompleted = slot.status === 'completed';
  const isMissed = slot.status === 'missed';
  const isCatchUp = Boolean(slot.isCatchUp);
  const isFuture = isFutureSlot(slot.date);

  const duration = slot.durationMinutes || 60;
  const whatToStudy = slot.whatToStudy && slot.whatToStudy.length > 0
    ? slot.whatToStudy
    : [
        `• Review core topics and textbook chapters for ${subjectName}`,
        `• Work through key formulas and standard solved problems`,
        `• Note down questions for revision and follow-up`,
      ];

  const handleToggle = () => {
    if (isFuture) return;
    const next = isCompleted ? 'pending' : 'completed';
    onToggleStatus(slot.id, next);
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-slot-title"
      data-testid="slot-detail-modal"
    >
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.subjectBadge}>
              <BookOpen size={13} aria-hidden="true" />
              {subjectName}
            </span>
            <h2 id="modal-slot-title" className={styles.dateTitle}>
              {formatFullDate(slot.date)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close session details"
            data-testid="close-slot-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Future Locked Alert Banner */}
          {isFuture && (
            <div className={styles.futureAlertBox} data-testid="modal-future-locked-banner">
              <Lock size={15} className={styles.futureAlertIcon} />
              <div>
                <p className={styles.futureAlertTitle}>Future Session (Locked)</p>
                <p className={styles.futureAlertDesc}>
                  This session is scheduled for {formatFullDate(slot.date)}. It will become available to complete on that day.
                </p>
              </div>
            </div>
          )}

          {/* Time and Status Banner */}
          <div className={styles.timeBanner}>
            <div className={styles.timeBlock}>
              <Clock size={16} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <span>{formatTimeRange(slot.startTime, slot.endTime)}</span>
              <span className={styles.durationPill}>{duration}m</span>
            </div>

            {isCompleted ? (
              <span className={styles.statusCompleted} data-testid="modal-status-badge">
                <CheckCircle2 size={14} /> Completed
              </span>
            ) : isCatchUp ? (
              <span className={styles.statusCatchUp} data-testid="modal-status-badge">
                <AlertTriangle size={14} /> Catch-up Required
              </span>
            ) : isMissed ? (
              <span className={styles.statusMissed} data-testid="modal-status-badge">
                <AlertTriangle size={14} /> Missed Session
              </span>
            ) : (
              <span className={styles.statusPending} data-testid="modal-status-badge">
                <Clock size={14} /> Pending
              </span>
            )}
          </div>

          {/* Today's Topic */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Today&apos;s Topic</p>
            <div className={styles.topicCard}>
              <h3 className={styles.topicTitle} data-testid="modal-topic-title">
                {slot.topic || `${subjectName} Core Focus`}
              </h3>
              {slot.chapter && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>
                  Chapter: <strong style={{ color: 'var(--color-foreground)' }}>{slot.chapter}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Metadata Grid: Source Material & Difficulty */}
          <div className={styles.metaGrid}>
            <div className={styles.metaCard}>
              <span className={styles.sectionLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <FileText size={11} /> Source Material
              </span>
              <span className={styles.metaValue} data-testid="modal-source-material">
                {slot.materialTitle || 'Standard Curriculum'}
              </span>
            </div>

            <div className={styles.metaCard}>
              <span className={styles.sectionLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Layers size={11} /> Chapter
              </span>
              <span className={styles.metaValue} data-testid="modal-chapter-name">
                {slot.chapter || 'Unit 1'}
              </span>
            </div>

            <div className={styles.metaCard}>
              <span className={styles.sectionLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Zap size={11} /> Difficulty
              </span>
              <span className={styles.metaValue} data-testid="modal-difficulty">
                {slot.difficulty || 'Medium'} {slot.difficultyScore ? `· ${slot.difficultyScore}/100` : ''}
              </span>
            </div>
          </div>

          {/* What to Study */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>What to Study</p>
            <ul className={styles.whatToStudyList} data-testid="modal-what-to-study-list">
              {whatToStudy.map((point, index) => (
                <li key={index} className={styles.whatToStudyItem}>
                  <span className={styles.bulletDot}>•</span>
                  <span>{point.replace(/^•\s*/, '')}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Selection Reason & Exam Context */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Why this was scheduled</p>
            <div className={styles.reasonBox}>
              <p className={styles.reasonText} data-testid="modal-selection-reason">
                {slot.selectionReason ||
                  'Scheduled by AI Study Planner to ensure progressive mastery of syllabus topics before upcoming deadlines.'}
              </p>
              {slot.examDeadline && (
                <div className={styles.examBadge} data-testid="modal-exam-deadline">
                  <Sparkles size={13} />
                  <span>
                    {slot.examName || 'Upcoming Exam'} on {formatFullDate(slot.examDeadline)}
                    {slot.daysUntilExam !== undefined && slot.daysUntilExam !== null && (
                      <strong> ({slot.daysUntilExam} day{slot.daysUntilExam === 1 ? '' : 's'} away)</strong>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <AppButton variant="outline" onClick={onClose} data-testid="modal-close-btn">
            Close
          </AppButton>
          {isFuture ? (
            <AppButton
              variant="outline"
              leftIcon={<Lock size={16} />}
              disabled={true}
              data-testid="modal-toggle-status-btn"
            >
              Locked (Future)
            </AppButton>
          ) : (
            <AppButton
              variant={isCompleted ? 'outline' : 'primary'}
              leftIcon={isCompleted ? <Clock size={16} /> : <CheckCircle2 size={16} />}
              onClick={handleToggle}
              data-testid="modal-toggle-status-btn"
            >
              {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
            </AppButton>
          )}
        </div>
      </div>
    </div>
  );
}

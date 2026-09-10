import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {MobileRevisionModal} from './MobileRevisionModal';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {
  formatDate,
  formatTime,
  formatTimeRange,
  slotDurationMinutes,
  evaluateMobileSessionState,
} from '@/utils/dateUtils';
import type {SlotResponse} from '@/types/timetable.types';

interface MobileSlotDetailModalProps {
  slot: SlotResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus?: (slotId: string) => void;
  isToggling?: boolean;
}

export function MobileSlotDetailModal({
  slot,
  isOpen,
  onClose,
  onToggleStatus,
  isToggling,
}: MobileSlotDetailModalProps) {
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);

  if (!isOpen || !slot) return null;

  const now = new Date();
  const evaluation = evaluateMobileSessionState(slot, now);
  const duration = slot.durationMinutes || slotDurationMinutes(slot.startTime, slot.endTime);
  const subjectName = slot.subject?.subjectName || 'Study Session';

  const priorityLevel =
    (slot as unknown as { priorityLevel?: 'HIGH' | 'MEDIUM' | 'LOW' }).priorityLevel ||
    (slot.subject as unknown as { priorityLevel?: 'HIGH' | 'MEDIUM' | 'LOW' })?.priorityLevel ||
    (slot.daysUntilExam !== undefined && slot.daysUntilExam !== null && slot.daysUntilExam <= 7
      ? 'HIGH'
      : (slot.difficultyScore && slot.difficultyScore >= 70) || (slot.difficulty && slot.difficulty.toLowerCase() === 'hard')
      ? 'HIGH'
      : (slot.difficulty && slot.difficulty.toLowerCase() === 'easy')
      ? 'LOW'
      : 'MEDIUM');

  const whatToStudy = slot.whatToStudy && slot.whatToStudy.length > 0
    ? slot.whatToStudy
    : [
        `Review core topics and textbook chapters for ${subjectName}`,
        'Work through key formulas and standard solved problems',
        'Note down questions for revision and follow-up',
      ];

  const renderStateBanner = () => {
    if (evaluation.isCompleted) {
      return (
        <View style={[styles.stateBanner, styles.stateCompleted]}>
          <Text style={styles.stateCompletedText}>
            ✅ COMPLETED · Verified with AI
          </Text>
        </View>
      );
    }
    if (evaluation.isLocked) {
      return (
        <View style={[styles.stateBanner, styles.stateLocked]}>
          <Text style={styles.stateLockedText}>
            🔒 LOCKED · Available on {slot.date ? formatDate(slot.date) : 'scheduled date'}
          </Text>
        </View>
      );
    }
    if (evaluation.isCatchUp && !evaluation.isMissed) {
      return (
        <View style={[styles.stateBanner, styles.stateCatchUp]}>
          <Text style={styles.stateCatchUpText}>
            📌 CATCH-UP TODAY · Actionable in study window
          </Text>
        </View>
      );
    }
    if (evaluation.isMissed) {
      return (
        <View style={[styles.stateBanner, styles.stateMissed]}>
          <Text style={styles.stateMissedText}>
            🔴 MISSED SESSION · Passed without completion
          </Text>
        </View>
      );
    }
    if (evaluation.isActive) {
      return (
        <View style={[styles.stateBanner, styles.stateActive]}>
          <Text style={styles.stateActiveText}>
            ⚡ ACTIVE NOW · Ends at {formatTime(slot.endTime)}
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.stateBanner, styles.stateUpcoming]}>
        <Text style={styles.stateUpcomingText}>
          ⏳ UPCOMING · Starts at {formatTime(slot.startTime)}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleBlock}>
              <View style={styles.subjectBadge}>
                <Text style={styles.subjectBadgeText}>{subjectName}</Text>
              </View>
              <Text style={styles.dateText}>
                {slot.date ? formatDate(slot.date) : 'Scheduled Study Slot'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
              accessibilityLabel="Close modal"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
            {/* State Status Banner */}
            {renderStateBanner()}

            {/* AI Revision Offer Card on Completed Sessions */}
            {evaluation.isCompleted && (
              <View style={styles.revisionOfferCard}>
                <View style={styles.revisionOfferHeader}>
                  <Text style={styles.revisionOfferTag}>✨ AI REVISION MODE</Text>
                  <Text style={styles.revisionOfferEst}>5–15 min</Text>
                </View>
                <Text style={styles.revisionOfferTitle}>Reinforce & Review Topic</Text>
                <Text style={styles.revisionOfferDesc}>
                  Summary, key formulas, common exam traps, and a 5-question interactive quiz generated for this session.
                </Text>
                <TouchableOpacity
                  style={styles.startRevisionBtn}
                  onPress={() => setIsRevisionOpen(true)}
                >
                  <Text style={styles.startRevisionBtnText}>Start Revision ➔</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Carry-Forward Catch-Up Context Box */}
            {evaluation.isCatchUp && slot.missedDate && (
              <View style={styles.catchUpBox}>
                <Text style={styles.catchUpTitle}>Carry-Forward Catch-Up Session</Text>
                <View style={styles.catchUpDatesRow}>
                  <View style={styles.catchUpDatePill}>
                    <Text style={styles.catchUpDatePillText}>
                      Original: {formatDate(slot.missedDate)}
                    </Text>
                  </View>
                  <Text style={styles.catchUpArrow}>➔</Text>
                  <View style={[styles.catchUpDatePill, styles.catchUpDatePillActive]}>
                    <Text style={styles.catchUpDatePillActiveText}>
                      Execution: Today
                    </Text>
                  </View>
                </View>
                <Text style={styles.catchUpDesc}>
                  Carried forward into today&apos;s available capacity to keep you on schedule before upcoming exams.
                </Text>
              </View>
            )}

            {/* Future Locked Alert */}
            {evaluation.isLocked && (
              <View style={styles.lockedBox}>
                <Text style={styles.lockedTitle}>Future Session (Locked)</Text>
                <Text style={styles.lockedDesc}>
                  This session unlocks on {slot.date ? formatDate(slot.date) : 'its scheduled date'}. Early completion is locked to protect streak integrity.
                </Text>
              </View>
            )}

            {/* Time and Duration Row */}
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>
                🕐 {formatTimeRange(slot.startTime, slot.endTime)}
              </Text>
              <View style={styles.durationBadge}>
                <Text style={styles.durationBadgeText}>{duration}m duration</Text>
              </View>
            </View>

            {/* Today's Topic */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TODAY&apos;S TOPIC</Text>
              <View style={styles.topicCard}>
                <Text style={styles.topicTitle}>{slot.topic || `${subjectName} Core Focus`}</Text>
                {slot.chapter && (
                  <Text style={styles.chapterSubtitle}>Chapter: {slot.chapter}</Text>
                )}
              </View>
            </View>

            {/* 4-Box Metadata Grid */}
            <View style={styles.metaGrid}>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>SOURCE MATERIAL</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {slot.materialTitle || 'Standard Syllabus'}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>CHAPTER</Text>
                <Text style={styles.metaValue}>{slot.chapter || 'Unit 1'}</Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>DIFFICULTY</Text>
                <Text style={styles.metaValue}>
                  {slot.difficulty || 'Medium'} {slot.difficultyScore ? `(${slot.difficultyScore}/100)` : ''}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>PRIORITY</Text>
                <Text
                  style={[
                    styles.priorityTag,
                    priorityLevel === 'HIGH'
                      ? styles.priorityHigh
                      : priorityLevel === 'LOW'
                      ? styles.priorityLow
                      : styles.priorityMedium,
                  ]}
                >
                  {priorityLevel}
                </Text>
              </View>
            </View>

            {/* What to Study */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>WHAT TO STUDY</Text>
              {whatToStudy.map((point, index) => (
                <View key={index} style={styles.studyPointRow}>
                  <Text style={styles.studyPointDot}>•</Text>
                  <Text style={styles.studyPointText}>{point.replace(/^•\s*/, '')}</Text>
                </View>
              ))}
            </View>

            {/* Exam Relevance & AI Reason */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>EXAM RELEVANCE & PLANNING REASON</Text>
              <View style={styles.reasonCard}>
                <Text style={styles.reasonText}>
                  {slot.selectionReason ||
                    'Scheduled by AI Study Planner to build progressive topic mastery before deadlines.'}
                </Text>
                {slot.examName && (
                  <View style={styles.examDeadlineBadge}>
                    <Text style={styles.examDeadlineText}>
                      📝 {slot.examName}
                      {slot.daysUntilExam !== undefined ? ` (${slot.daysUntilExam}d away)` : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Evidence & Verification status */}
            {slot.hasEvidence && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>AI VERIFICATION & PROOF</Text>
                <View style={styles.evidenceCard}>
                  <Text style={styles.evidenceStatusText}>
                    Status: {slot.evidenceStatus || 'SUBMITTED'} {slot.evidenceScore ? `· Score: ${slot.evidenceScore}/100` : ''}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.closeActionBtn}>
              <Text style={styles.closeActionBtnText}>Close</Text>
            </TouchableOpacity>

            {evaluation.isCompleted && (
              <TouchableOpacity
                onPress={() => setIsRevisionOpen(true)}
                style={styles.reviewTopicFooterBtn}
              >
                <Text style={styles.reviewTopicFooterBtnText}>✨ Review Topic</Text>
              </TouchableOpacity>
            )}

            {!evaluation.isLocked && onToggleStatus && (
              <TouchableOpacity
                onPress={() => onToggleStatus(slot.id)}
                disabled={isToggling}
                style={[
                  styles.toggleActionBtn,
                  evaluation.isCompleted ? styles.toggleActionBtnIncomplete : styles.toggleActionBtnComplete,
                ]}
              >
                <Text style={styles.toggleActionBtnText}>
                  {isToggling
                    ? 'Updating…'
                    : evaluation.isCompleted
                    ? 'Mark Incomplete'
                    : 'Mark as Completed'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Embedded AI Revision Modal */}
      <MobileRevisionModal
        isOpen={isRevisionOpen}
        onClose={() => setIsRevisionOpen(false)}
        slotId={slot.id}
        topic={slot.topic}
        subjectName={subjectName}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.BG_SURFACE,
    borderTopLeftRadius: RADIUS.LG,
    borderTopRightRadius: RADIUS.LG,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BG_BORDER,
  },
  headerTitleBlock: {
    flex: 1,
    gap: 4,
  },
  subjectBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.SECONDARY,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  closeBtn: {
    padding: SPACING.XS,
  },
  closeBtnText: {
    fontSize: 18,
    color: COLORS.TEXT_MUTED,
    fontWeight: '700',
  },
  scrollBody: {
    maxHeight: 480,
  },
  scrollContent: {
    padding: SPACING.MD,
    gap: SPACING.MD,
  },
  stateBanner: {
    borderRadius: RADIUS.SM,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
  },
  stateCompleted: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  stateCompletedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  stateLocked: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: COLORS.BG_BORDER,
  },
  stateLockedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
  },
  stateCatchUp: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  stateCatchUpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
  },
  stateMissed: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  stateMissedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  stateActive: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  stateActiveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
  },
  stateUpcoming: {
    backgroundColor: 'rgba(108,99,255,0.12)',
    borderColor: 'rgba(108,99,255,0.3)',
  },
  stateUpcomingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.PRIMARY_LIGHT,
  },
  catchUpBox: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: RADIUS.SM,
    padding: SPACING.SM + 2,
    gap: 4,
  },
  catchUpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
  },
  catchUpDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  catchUpDatePill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catchUpDatePillText: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
  },
  catchUpDatePillActive: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  catchUpDatePillActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  catchUpArrow: {
    color: COLORS.TEXT_MUTED,
    fontSize: 11,
  },
  catchUpDesc: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 16,
  },
  lockedBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    borderRadius: RADIUS.SM,
    padding: SPACING.SM,
    gap: 2,
  },
  lockedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
  },
  lockedDesc: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    lineHeight: 15,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.SM,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  durationBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.TEXT_MUTED,
  },
  topicCard: {
    backgroundColor: 'rgba(0,212,170,0.05)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.SECONDARY,
    borderRadius: RADIUS.SM,
    padding: SPACING.SM,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.2)',
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  chapterSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  metaBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.BG_ELEVATED,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    borderRadius: RADIUS.SM,
    padding: SPACING.SM,
    gap: 2,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.TEXT_MUTED,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  priorityTag: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.FULL,
    marginTop: 2,
  },
  priorityHigh: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    color: '#ef4444',
  },
  priorityMedium: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    color: '#f59e0b',
  },
  priorityLow: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    color: '#10b981',
  },
  studyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 2,
  },
  studyPointDot: {
    color: COLORS.SECONDARY,
    fontSize: 14,
    fontWeight: '800',
  },
  studyPointText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 17,
  },
  reasonCard: {
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.SM,
    padding: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    gap: 4,
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 16,
  },
  examDeadlineBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    marginTop: 2,
  },
  examDeadlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
  },
  evidenceCard: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: RADIUS.SM,
    padding: SPACING.SM,
  },
  evidenceStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.SM,
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BG_BORDER,
  },
  closeActionBtn: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  closeActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  toggleActionBtn: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.SM,
  },
  toggleActionBtnComplete: {
    backgroundColor: COLORS.PRIMARY,
  },
  toggleActionBtnIncomplete: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  toggleActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  revisionOfferCard: {
    backgroundColor: 'rgba(108,99,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
    borderRadius: RADIUS.MD,
    padding: SPACING.MD,
    gap: SPACING.XS,
  },
  revisionOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  revisionOfferTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.PRIMARY_LIGHT,
    letterSpacing: 0.5,
  },
  revisionOfferEst: {
    fontSize: 10,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  revisionOfferTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  revisionOfferDesc: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 16,
    marginBottom: SPACING.XS,
  },
  startRevisionBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.SM,
    alignItems: 'center',
  },
  startRevisionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewTopicFooterBtn: {
    backgroundColor: 'rgba(108,99,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.4)',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.SM,
  },
  reviewTopicFooterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.PRIMARY_LIGHT,
  },
});



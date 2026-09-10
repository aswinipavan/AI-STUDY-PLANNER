import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Card} from '@/components/common/Card';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {
  formatTimeRange,
  formatDate,
  formatTime,
  slotDurationMinutes,
  evaluateMobileSessionState,
} from '@/utils/dateUtils';
import type {SlotResponse} from '@/types/timetable.types';

interface SlotCardProps {
  slot: SlotResponse;
  onToggle?: () => void;
  isToggling?: boolean;
  onPress?: () => void;
}

export function SlotCard({slot, onToggle, isToggling, onPress}: SlotCardProps) {
  const duration = slot.durationMinutes || slotDurationMinutes(slot.startTime, slot.endTime);
  const evaluation = evaluateMobileSessionState(slot, new Date());

  const priorityLevel =
    (slot as any).priorityLevel ||
    (slot.subject as any)?.priorityLevel ||
    (slot.daysUntilExam !== undefined && slot.daysUntilExam !== null && slot.daysUntilExam <= 7
      ? 'HIGH'
      : (slot.difficultyScore && slot.difficultyScore >= 70) || (slot.difficulty && slot.difficulty.toLowerCase() === 'hard')
      ? 'HIGH'
      : (slot.difficulty && slot.difficulty.toLowerCase() === 'easy')
      ? 'LOW'
      : 'MEDIUM');

  return (
    <Card
      style={[
        styles.card,
        evaluation.isCompleted
          ? styles.completedCard
          : evaluation.isLocked
          ? styles.futureCard
          : evaluation.isCatchUp
          ? styles.catchUpCard
          : evaluation.isMissed
          ? styles.missedCard
          : evaluation.isActive
          ? styles.activeCard
          : undefined,
      ]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={styles.cardTouchArea}
      >
        {/* Status Tag Row */}
        <View style={styles.tagRow}>
          {evaluation.isCompleted ? (
            <View style={styles.completedTag}>
              <Text style={styles.completedTagText}>✅ COMPLETED</Text>
            </View>
          ) : evaluation.isLocked ? (
            <View style={styles.futureTag}>
              <Text style={styles.futureTagText}>
                🔒 LOCKED · {slot.date ? formatDate(slot.date) : 'Future'}
              </Text>
            </View>
          ) : evaluation.isCatchUp && !evaluation.isMissed ? (
            <View style={styles.catchUpTag}>
              <Text style={styles.catchUpTagText}>
                {evaluation.isActive ? '⚡ ACTIVE CATCH-UP' : '📌 CATCH-UP TODAY'}
              </Text>
            </View>
          ) : evaluation.isMissed ? (
            <View style={styles.missedTag}>
              <Text style={styles.missedTagText}>🔴 MISSED</Text>
            </View>
          ) : evaluation.isActive ? (
            <View style={styles.activeTag}>
              <Text style={styles.activeTagText}>⚡ ACTIVE NOW</Text>
            </View>
          ) : (
            <View style={styles.upcomingTag}>
              <Text style={styles.upcomingTagText}>
                ⏳ UPCOMING · {formatTime(slot.startTime)}
              </Text>
            </View>
          )}

          {/* Priority Tag */}
          <View
            style={[
              styles.priorityPill,
              priorityLevel === 'HIGH'
                ? styles.priorityHigh
                : priorityLevel === 'LOW'
                ? styles.priorityLow
                : styles.priorityMedium,
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                priorityLevel === 'HIGH'
                  ? styles.priorityHighText
                  : priorityLevel === 'LOW'
                  ? styles.priorityLowText
                  : styles.priorityMediumText,
              ]}
            >
              {priorityLevel}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          {/* Completion toggle */}
          <TouchableOpacity
            onPress={(e) => {
              if (evaluation.isLocked) return;
              if (onToggle) onToggle();
            }}
            disabled={isToggling || evaluation.isLocked}
            style={[
              styles.checkbox,
              evaluation.isCompleted && styles.checkboxDone,
              evaluation.isLocked && styles.checkboxLocked,
            ]}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          >
            {evaluation.isCompleted && <Text style={styles.checkmark}>✓</Text>}
            {evaluation.isLocked && <Text style={styles.lockIcon}>🔒</Text>}
          </TouchableOpacity>

          {/* Content */}
          <View style={styles.content}>
            <Text
              style={[
                styles.subjectName,
                evaluation.isCompleted && styles.completedText,
              ]}
              numberOfLines={1}
            >
              {slot.subject?.subjectName || 'Study Session'}
            </Text>

            <Text style={styles.timeRange}>
              {formatTimeRange(slot.startTime, slot.endTime)} · {duration}m
            </Text>

            {slot.chapter && (
              <Text style={styles.chapterText} numberOfLines={1}>
                📚 {slot.chapter}
              </Text>
            )}

            {slot.topic && (
              <Text style={styles.topic} numberOfLines={2}>
                📖 {slot.topic}
              </Text>
            )}
          </View>

          {/* Duration badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{duration}m</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.SM,
    paddingVertical: SPACING.SM,
  },
  cardTouchArea: {
    width: '100%',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.XS,
  },
  completedCard: {
    opacity: 0.75,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  futureCard: {
    opacity: 0.85,
    borderColor: COLORS.BG_BORDER,
  },
  activeCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.05)',
  },
  catchUpCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  missedCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.SM,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    marginRight: SPACING.MD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: COLORS.SECONDARY,
    borderColor: COLORS.SECONDARY,
  },
  checkboxLocked: {
    borderColor: COLORS.TEXT_MUTED,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  lockIcon: {
    fontSize: 11,
  },
  content: {flex: 1},
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: COLORS.TEXT_MUTED,
  },
  timeRange: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  chapterText: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  topic: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    fontStyle: 'italic',
  },
  badge: {
    backgroundColor: COLORS.PRIMARY_GLOW,
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 3,
    marginLeft: SPACING.SM,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.PRIMARY_LIGHT,
  },
  catchUpTag: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  catchUpTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f59e0b',
  },
  completedTag: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  completedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  activeTag: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  upcomingTag: {
    backgroundColor: 'rgba(108,99,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  upcomingTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.PRIMARY_LIGHT,
  },
  futureTag: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  futureTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
  },
  missedTag: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  missedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
  },
  priorityPill: {
    borderRadius: RADIUS.FULL,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  priorityHigh: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  priorityHighText: {
    color: '#ef4444',
  },
  priorityMedium: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  priorityMediumText: {
    color: '#f59e0b',
  },
  priorityLow: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  priorityLowText: {
    color: '#10b981',
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
  },
});


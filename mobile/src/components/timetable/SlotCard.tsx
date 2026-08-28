import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Card} from '@/components/common/Card';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {formatTimeRange, slotDurationMinutes} from '@/utils/dateUtils';
import type {SlotResponse} from '@/types/timetable.types';

interface SlotCardProps {
  slot: SlotResponse;
  onToggle?: () => void;
  isToggling?: boolean;
}

export function SlotCard({slot, onToggle, isToggling}: SlotCardProps) {
  const duration = slotDurationMinutes(slot.startTime, slot.endTime);

  return (
    <Card
      style={[
        styles.card,
        slot.isCompleted
          ? styles.completedCard
          : slot.isCatchUp
          ? styles.catchUpCard
          : slot.status === 'missed'
          ? styles.missedCard
          : undefined,
      ]}>
      {slot.isCatchUp && !slot.isCompleted && (
        <View style={styles.catchUpTag}>
          <Text style={styles.catchUpTagText}>🔴 MISSED — COMPLETE TODAY</Text>
        </View>
      )}
      <View style={styles.row}>
        {/* Completion toggle */}
        <TouchableOpacity
          onPress={onToggle}
          disabled={isToggling}
          style={[styles.checkbox, slot.isCompleted && styles.checkboxDone]}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          {slot.isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[
              styles.subjectName,
              slot.isCompleted && styles.completedText,
            ]}
            numberOfLines={1}>
            {slot.subject.subjectName}
          </Text>

          <Text style={styles.timeRange}>
            {formatTimeRange(slot.startTime, slot.endTime)} · {duration}m
          </Text>

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
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.SM,
    paddingVertical: SPACING.SM + 4,
  },
  completedCard: {
    opacity: 0.65,
    borderColor: COLORS.SECONDARY + '40',
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
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
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
  topic: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: SPACING.XS,
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
  catchUpCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  missedCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  catchUpTag: {
    backgroundColor: '#ef444422',
    borderWidth: 1,
    borderColor: '#ef444466',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: SPACING.XS,
  },
  catchUpTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
  },
});

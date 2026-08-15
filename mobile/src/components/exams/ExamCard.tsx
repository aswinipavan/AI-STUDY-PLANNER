import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Card} from '@/components/common/Card';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {formatDate, formatExamCountdown} from '@/utils/dateUtils';
import type {ExamResponse} from '@/types/exam.types';

interface ExamCardProps {
  exam: ExamResponse;
  onEdit?: () => void;
  onDelete?: () => void;
  onMarkComplete?: () => void;
}

export function ExamCard({exam, onEdit, onDelete, onMarkComplete}: ExamCardProps) {
  const isUrgent = exam.daysRemaining <= 3 && !exam.isCompleted;
  const isCompleted = exam.isCompleted;

  return (
    <Card style={[styles.card, isCompleted ? styles.completedCard : undefined]}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={styles.examName} numberOfLines={1}>
            {exam.examName ?? exam.subject.subjectName}
          </Text>
          <Text style={styles.subjectName}>{exam.subject.subjectName}</Text>
          {exam.examType && (
            <Text style={styles.type}>{exam.examType}</Text>
          )}
        </View>

        <View style={styles.dateBlock}>
          <Text style={styles.date}>{formatDate(exam.examDate)}</Text>
          {!isCompleted && (
            <View
              style={[
                styles.countdownBadge,
                isUrgent ? styles.urgentBadge : styles.normalBadge,
              ]}>
              <Text
                style={[
                  styles.countdownText,
                  isUrgent ? styles.urgentText : styles.normalText,
                ]}>
                {formatExamCountdown(exam.daysRemaining)}
              </Text>
            </View>
          )}
          {isCompleted && (
            <View style={styles.doneBadge}>
              <Text style={styles.doneText}>✓ Done</Text>
            </View>
          )}
        </View>
      </View>

      {(onEdit || onDelete || onMarkComplete) && (
        <View style={styles.actions}>
          {!isCompleted && onMarkComplete && (
            <TouchableOpacity onPress={onMarkComplete} style={styles.actionBtn}>
              <Text style={styles.completeText}>Mark Done</Text>
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: SPACING.SM},
  completedCard: {opacity: 0.6},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  content: {flex: 1, marginRight: SPACING.MD},
  examName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  subjectName: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  type: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dateBlock: {alignItems: 'flex-end'},
  date: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  countdownBadge: {
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 3,
    marginTop: SPACING.XS,
  },
  urgentBadge: {backgroundColor: COLORS.DANGER + '22'},
  normalBadge: {backgroundColor: COLORS.PRIMARY_GLOW},
  countdownText: {fontSize: 11, fontWeight: '700'},
  urgentText: {color: COLORS.DANGER},
  normalText: {color: COLORS.PRIMARY_LIGHT},
  doneBadge: {
    backgroundColor: COLORS.SUCCESS + '22',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 3,
    marginTop: SPACING.XS,
  },
  doneText: {fontSize: 11, fontWeight: '700', color: COLORS.SUCCESS},
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BG_BORDER,
    paddingTop: SPACING.SM,
    gap: SPACING.MD,
  },
  actionBtn: {padding: SPACING.XS},
  completeText: {color: COLORS.SUCCESS, fontWeight: '600', fontSize: 13},
  editText: {color: COLORS.PRIMARY, fontWeight: '600', fontSize: 13},
  deleteText: {color: COLORS.DANGER, fontWeight: '600', fontSize: 13},
});

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Card} from '@/components/common/Card';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import type {SubjectResponse} from '@/types/student.types';

const DIFFICULTY_COLORS: Record<number, string> = {
  1: COLORS.DIFFICULTY_1,
  2: COLORS.DIFFICULTY_2,
  3: COLORS.DIFFICULTY_3,
  4: COLORS.DIFFICULTY_4,
  5: COLORS.DIFFICULTY_5,
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Simple',
  3: 'Medium',
  4: 'Hard',
  5: 'Expert',
};

interface SubjectCardProps {
  subject: SubjectResponse;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SubjectCard({subject, onEdit, onDelete}: SubjectCardProps) {
  const difficultyColor = DIFFICULTY_COLORS[subject.difficultyLevel] ?? COLORS.TEXT_MUTED;
  const difficultyLabel = DIFFICULTY_LABELS[subject.difficultyLevel] ?? 'Unknown';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {subject.subjectName}
          </Text>
          {subject.subjectCode && (
            <Text style={styles.code}>{subject.subjectCode}</Text>
          )}
        </View>
        <View
          style={[styles.difficultyBadge, {backgroundColor: difficultyColor + '22'}]}>
          <View style={[styles.difficultyDot, {backgroundColor: difficultyColor}]} />
          <Text style={[styles.difficultyText, {color: difficultyColor}]}>
            {difficultyLabel}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        {subject.credits != null && (
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>📚 {subject.credits} credits</Text>
          </View>
        )}
        {subject.semester != null && (
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>📅 Sem {subject.semester}</Text>
          </View>
        )}
      </View>

      {(onEdit || onDelete) && (
        <View style={styles.actions}>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameBlock: {flex: 1, marginRight: SPACING.SM},
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  code: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: RADIUS.FULL,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    marginTop: SPACING.SM,
    gap: SPACING.XS,
  },
  metaChip: {
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.SM,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.SM,
    gap: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BG_BORDER,
    paddingTop: SPACING.SM,
  },
  actionBtn: {padding: SPACING.XS},
  editText: {color: COLORS.PRIMARY, fontWeight: '600', fontSize: 13},
  deleteText: {color: COLORS.DANGER, fontWeight: '600', fontSize: 13},
});

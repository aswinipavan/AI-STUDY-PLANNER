import React from 'react';
import {ScrollView, TouchableOpacity, Text, StyleSheet} from 'react-native';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {DAY_SHORT} from '@/utils/dateUtils';

interface DaySelectorProps {
  selectedDay: number; // 0=Mon … 6=Sun
  onSelectDay: (day: number) => void;
  activeDays?: number[]; // days that have slots
}

export function DaySelector({selectedDay, onSelectDay, activeDays = []}: DaySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {DAY_SHORT.map((label, index) => {
        const isSelected = selectedDay === index;
        const hasSlots = activeDays.includes(index);
        return (
          <TouchableOpacity
            key={index}
            onPress={() => onSelectDay(index)}
            style={[styles.dayBtn, isSelected && styles.dayBtnActive]}>
            <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>
              {label}
            </Text>
            {hasSlots && !isSelected && <Text style={styles.dot}>·</Text>}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    gap: SPACING.SM,
  },
  dayBtn: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.FULL,
    backgroundColor: COLORS.BG_SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    alignItems: 'center',
    minWidth: 52,
  },
  dayBtnActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  dayLabelActive: {
    color: '#fff',
  },
  dot: {
    fontSize: 20,
    color: COLORS.SECONDARY,
    lineHeight: 10,
    marginTop: 2,
  },
});

import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {COLORS} from '@/constants/colors';
import {RADIUS, SPACING, SHADOWS} from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  noPadding?: boolean;
}

export function Card({children, style, elevated = false, noPadding = false}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        noPadding && styles.noPadding,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.BG_SURFACE,
    borderRadius: RADIUS.LG,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    ...SHADOWS.card,
  },
  elevated: {
    backgroundColor: COLORS.BG_ELEVATED,
    ...SHADOWS.card,
  },
  noPadding: {
    padding: 0,
  },
});

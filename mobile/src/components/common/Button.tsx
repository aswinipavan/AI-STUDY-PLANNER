import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {COLORS} from '@/constants/colors';
import {RADIUS, SPACING} from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.78}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? COLORS.TEXT_INVERSE : COLORS.PRIMARY}
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  // ── Variants ────────────────────────────────────────────────────────────────
  primary: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondary: {
    backgroundColor: COLORS.BG_ELEVATED,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: COLORS.DANGER,
  },
  disabled: {
    opacity: 0.5,
  },
  // ── Sizes ───────────────────────────────────────────────────────────────────
  size_sm: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    minHeight: 36,
  },
  size_md: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM + 4,
    minHeight: 48,
  },
  size_lg: {
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    minHeight: 56,
  },
  // ── Label colors ────────────────────────────────────────────────────────────
  label: {
    fontWeight: '600',
    fontSize: 15,
  },
  label_primary: {color: '#FFFFFF'},
  label_secondary: {color: COLORS.TEXT_PRIMARY},
  label_ghost: {color: COLORS.PRIMARY},
  label_danger: {color: '#FFFFFF'},
});

import {StyleSheet} from 'react-native';
import {COLORS} from './colors';

/** Shared spacing scale */
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

/** Border radius tokens */
export const RADIUS = {
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 24,
  FULL: 9999,
} as const;

/** Typography scale */
export const TYPOGRAPHY = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.TEXT_PRIMARY,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.TEXT_MUTED,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

/** Shared shadow presets */
export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
} as const;

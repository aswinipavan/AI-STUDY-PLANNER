import React from 'react';
import {View, ActivityIndicator, Text, StyleSheet} from 'react-native';
import {COLORS} from '@/constants/colors';
import {SPACING} from '@/constants/theme';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  message = 'Loading...',
  fullScreen = false,
}: LoadingSpinnerProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.BG_DEEP,
  },
  message: {
    marginTop: SPACING.MD,
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
  },
});

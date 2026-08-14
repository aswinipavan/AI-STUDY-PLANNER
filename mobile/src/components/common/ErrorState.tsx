import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Button} from './Button';
import {COLORS} from '@/constants/colors';
import {SPACING} from '@/constants/theme';
import {getErrorMessage, isTimeoutError} from '@/utils/errorHandler';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({error, onRetry, title}: ErrorStateProps) {
  const isTimeout = isTimeoutError(error);
  const message = getErrorMessage(error);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{isTimeout ? '⏳' : '⚠️'}</Text>
      <Text style={styles.title}>
        {title ?? (isTimeout ? 'Server is waking up…' : 'Something went wrong')}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {isTimeout && (
        <Text style={styles.hint}>
          The backend may be starting from cold. Please wait a moment.
        </Text>
      )}
      {onRetry && (
        <Button
          label="Try Again"
          onPress={onRetry}
          variant="secondary"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XXL,
  },
  icon: {fontSize: 48, marginBottom: SPACING.MD},
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  message: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.MD,
  },
  hint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    marginBottom: SPACING.MD,
    fontStyle: 'italic',
  },
  button: {marginTop: SPACING.SM, minWidth: 140},
});

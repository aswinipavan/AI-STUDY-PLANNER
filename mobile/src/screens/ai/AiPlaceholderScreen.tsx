import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {COLORS} from '@/constants/colors';
import {SPACING} from '@/constants/theme';

/**
 * AI tab placeholder — Phase 2 will implement the full AI chat screen.
 */
export function AiPlaceholderScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.icon}>🤖</Text>
        <Text style={styles.title}>AI Study Assistant</Text>
        <Text style={styles.subtitle}>
          Your intelligent study companion is coming in Phase 2.
        </Text>
        <View style={styles.features}>
          {[
            '💬 Smart chat with context-aware answers',
            '📊 Personalized performance analysis',
            '📝 AI-powered exam preparation plans',
            '💡 Daily motivation & study tips',
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.BG_DEEP},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  icon: {fontSize: 72, marginBottom: SPACING.LG},
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.XL,
  },
  features: {
    width: '100%',
    gap: SPACING.SM,
  },
  featureRow: {
    backgroundColor: COLORS.BG_SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  featureText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
  },
});

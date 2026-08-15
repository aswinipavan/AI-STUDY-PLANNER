import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {Card} from '@/components/common/Card';
import {LoadingSpinner} from '@/components/common/LoadingSpinner';
import {ErrorState} from '@/components/common/ErrorState';
import {Button} from '@/components/common/Button';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {
  usePerformanceReport,
  usePrioritySubjects,
} from '@/hooks/usePerformance';
import {useAnalyzePerformance} from '@/hooks/useAi';
import type {SubjectResponse} from '@/types/student.types';


export function AnalyticsScreen() {
  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
    refetch: refetchReport,
  } = usePerformanceReport();

  const {
    data: prioritySubjects,
    isLoading: priorityLoading,
    refetch: refetchPriority,
  } = usePrioritySubjects();

  const {mutate: triggerAiAnalysis, isPending: isAnalyzing} =
    useAnalyzePerformance();

  const isLoading = reportLoading || priorityLoading;

  const onRefresh = () => {
    refetchReport();
    refetchPriority();
  };

  const handleAiAnalysis = () => {
    triggerAiAnalysis(undefined, {
      onSuccess: (summary) => {
        Alert.alert('🤖 AI Performance Insights', summary || 'Performance looks good!');
      },
      onError: () => {
        Alert.alert('Notice', 'AI analysis could not be generated at this time. Please try again later.');
      },
    });
  };

  if (isLoading && !report) {
    return <LoadingSpinner fullScreen message="Crunching study analytics..." />;
  }

  if (reportError && !report) {
    return <ErrorState error={reportError} onRetry={onRefresh} />;
  }

  const score = Math.round(report?.overallPercentage || 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Performance Analytics" subtitle="Study trends & subject mastery" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={COLORS.PRIMARY}
          />
        }>
        {/* Overall Score Card */}
        <Card style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Overall Mastery</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{score}%</Text>
          </View>
          <Text style={styles.scoreSubtext}>
            {score >= 75
              ? '🌟 Excellent performance! Keep up the momentum.'
              : score >= 50
              ? '📈 Good steady progress. Focus on weak areas.'
              : '🎯 Needs attention. Use AI recommendations below.'}
          </Text>
        </Card>

        {/* AI Insight Trigger */}
        <Button
          label={isAnalyzing ? 'Analyzing with AI...' : '✨ Generate AI Performance Report'}
          onPress={handleAiAnalysis}
          loading={isAnalyzing}
          variant="secondary"
          size="md"
          style={styles.aiButton}
        />

        {/* Priority / Focus Subjects */}
        {prioritySubjects && prioritySubjects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Focus Areas (Weakest First)</Text>
            {prioritySubjects.map((subject: SubjectResponse, index: number) => (
              <Card key={subject.id} style={styles.priorityCard}>
                <View style={styles.priorityRow}>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityIndex}>#{index + 1}</Text>
                  </View>
                  <View style={styles.priorityInfo}>
                    <Text style={styles.subjectName}>{subject.subjectName}</Text>
                    {subject.subjectCode && (
                      <Text style={styles.subjectCode}>{subject.subjectCode}</Text>
                    )}
                  </View>
                  <View style={styles.difficultyPill}>
                    <Text style={styles.difficultyText}>
                      Level {subject.difficultyLevel}/5
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Strong vs Weak breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Subject Breakdown</Text>
          <View style={styles.splitRow}>
            {/* Strong */}
            <Card style={styles.splitCard}>
              <Text style={styles.splitTitle}>💪 Strong Areas</Text>
              {report?.strongSubjects && report.strongSubjects.length > 0 ? (
                report.strongSubjects.map((s: SubjectResponse) => (
                  <Text key={s.id} style={styles.strongItem} numberOfLines={1}>
                    • {s.subjectName}
                  </Text>
                ))
              ) : (
                <Text style={styles.emptySplitText}>Keep scoring high in exams to see strengths!</Text>
              )}
            </Card>

            {/* Weak */}
            <Card style={styles.splitCard}>
              <Text style={styles.splitTitle}>⚠️ Needs Work</Text>
              {report?.weakSubjects && report.weakSubjects.length > 0 ? (
                report.weakSubjects.map((s: SubjectResponse) => (
                  <Text key={s.id} style={styles.weakItem} numberOfLines={1}>
                    • {s.subjectName}
                  </Text>
                ))
              ) : (
                <Text style={styles.emptySplitText}>No critical weak subjects detected.</Text>
              )}
            </Card>
          </View>
        </View>

        {/* Recommendations */}
        {report?.recommendations && report.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Smart Study Recommendations</Text>
            {report.recommendations.map((rec: string, i: number) => (
              <Card key={i} style={styles.recCard}>
                <Text style={styles.recIcon}>📌</Text>
                <Text style={styles.recText}>{rec}</Text>
              </Card>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DEEP,
  },
  content: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XXL,
  },
  scoreCard: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
    backgroundColor: COLORS.BG_SURFACE,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  scoreCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.PRIMARY + '20',
    borderWidth: 4,
    borderColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.MD,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.PRIMARY_LIGHT,
  },
  scoreSubtext: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: SPACING.MD,
  },
  aiButton: {
    marginVertical: SPACING.MD,
  },
  section: {
    marginTop: SPACING.MD,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  priorityCard: {
    marginBottom: SPACING.SM,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.WARNING + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
  },
  priorityIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.WARNING,
  },
  priorityInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  subjectCode: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  difficultyPill: {
    backgroundColor: COLORS.BG_ELEVATED,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: RADIUS.SM,
  },
  difficultyText: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  splitRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  splitCard: {
    flex: 1,
    minHeight: 110,
  },
  splitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  strongItem: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    marginBottom: 4,
    fontWeight: '500',
  },
  weakItem: {
    fontSize: 12,
    color: COLORS.DANGER,
    marginBottom: 4,
    fontWeight: '500',
  },
  emptySplitText: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  recIcon: {
    fontSize: 16,
  },
  recText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
  },
});

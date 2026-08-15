import React, {useState} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  useAllExams,
  useUpcomingExams,
  useDeleteExam,
  useMarkExamComplete,
} from '@/hooks/useExams';
import {ExamCard} from '@/components/exams/ExamCard';
import {LoadingSpinner} from '@/components/common/LoadingSpinner';
import {EmptyState} from '@/components/common/EmptyState';
import {ErrorState} from '@/components/common/ErrorState';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import type {ExamsStackParamList} from '@/navigation/AppTabs';
import type {ExamResponse} from '@/types/exam.types';

type ExamsNav = NativeStackNavigationProp<ExamsStackParamList, 'ExamsList'>;

export function ExamsScreen() {
  const navigation = useNavigation<ExamsNav>();
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');

  const {data: upcomingExams, isLoading: loadingUpcoming, error: errorUpcoming, refetch: refetchUpcoming} = useUpcomingExams();
  const {data: allExams, isLoading: loadingAll, error: errorAll, refetch: refetchAll} = useAllExams();
  const {mutate: deleteExam} = useDeleteExam();
  const {mutate: markComplete} = useMarkExamComplete();

  const isLoading = filter === 'upcoming' ? loadingUpcoming : loadingAll;
  const error = filter === 'upcoming' ? errorUpcoming : errorAll;
  const exams = filter === 'upcoming' ? upcomingExams : allExams;
  const refetch = filter === 'upcoming' ? refetchUpcoming : refetchAll;

  const handleDelete = (exam: ExamResponse) => {
    Alert.alert(
      'Delete Exam',
      `Remove "${exam.examName ?? exam.subject.subjectName}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteExam(exam.id, {
              onError: () => Alert.alert('Error', 'Failed to delete exam.'),
            }),
        },
      ],
    );
  };

  const handleMarkComplete = (exam: ExamResponse) => {
    Alert.alert(
      'Mark as Complete',
      `Mark "${exam.examName ?? exam.subject.subjectName}" as done?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Mark Done',
          onPress: () =>
            markComplete(exam.id, {
              onError: () => Alert.alert('Error', 'Failed to update exam.'),
            }),
        },
      ],
    );
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading exams…" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Exams"
        subtitle={`${exams?.length ?? 0} ${filter === 'upcoming' ? 'upcoming' : 'total'}`}
        rightElement={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddExam', undefined)}
            style={styles.addBtn}>
            <Text style={styles.addBtnText}>＋ Add</Text>
          </TouchableOpacity>
        }
      />

      {/* Filter toggle */}
      <View style={styles.filterRow}>
        {(['upcoming', 'all'] as const).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
            <Text
              style={[
                styles.filterBtnText,
                filter === f && styles.filterBtnTextActive,
              ]}>
              {f === 'upcoming' ? '⏰ Upcoming' : '📋 All Exams'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={exams}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <ExamCard
            exam={item}
            onEdit={() => navigation.navigate('AddExam', {examId: item.id})}
            onDelete={() => handleDelete(item)}
            onMarkComplete={!item.isCompleted ? () => handleMarkComplete(item) : undefined}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📝"
            title={filter === 'upcoming' ? 'No upcoming exams' : 'No exams yet'}
            subtitle={
              filter === 'upcoming'
                ? 'Add your upcoming exams to track preparation'
                : 'Start tracking your exams here'
            }
            actionLabel="Add Exam"
            onAction={() => navigation.navigate('AddExam', undefined)}
          />
        }
        refreshing={isLoading}
        onRefresh={refetch}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.BG_DEEP},
  addBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: 8,
  },
  addBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
  filterRow: {
    flexDirection: 'row',
    padding: SPACING.MD,
    gap: SPACING.SM,
    paddingTop: SPACING.SM,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.BG_SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  filterBtnActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterBtnText: {fontSize: 13, fontWeight: '600', color: COLORS.TEXT_SECONDARY},
  filterBtnTextActive: {color: '#fff'},
  list: {padding: SPACING.MD, paddingTop: 0, paddingBottom: SPACING.XXL},
});

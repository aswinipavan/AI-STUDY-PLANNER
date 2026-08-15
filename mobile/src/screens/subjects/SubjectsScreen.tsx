import React, {useState} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSubjects, useDeleteSubject} from '@/hooks/useStudent';
import {SubjectCard} from '@/components/subjects/SubjectCard';
import {LoadingSpinner} from '@/components/common/LoadingSpinner';
import {EmptyState} from '@/components/common/EmptyState';
import {ErrorState} from '@/components/common/ErrorState';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {Button} from '@/components/common/Button';
import {COLORS} from '@/constants/colors';
import {SPACING} from '@/constants/theme';
import type {SubjectsStackParamList} from '@/navigation/AppTabs';
import type {SubjectResponse} from '@/types/student.types';

type SubjectsNav = NativeStackNavigationProp<SubjectsStackParamList, 'SubjectsList'>;

export function SubjectsScreen() {
  const navigation = useNavigation<SubjectsNav>();
  const {data: subjects, isLoading, error, refetch} = useSubjects();
  const {mutate: deleteSubject, isPending: isDeleting} = useDeleteSubject();

  const handleDelete = (subject: SubjectResponse) => {
    Alert.alert(
      'Delete Subject',
      `Remove "${subject.subjectName}"? This will also remove related timetable slots.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteSubject(subject.id, {
              onError: () =>
                Alert.alert('Error', 'Failed to delete subject. Please try again.'),
            }),
        },
      ],
    );
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading subjects…" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="My Subjects"
        subtitle={`${subjects?.length ?? 0} subjects`}
        rightElement={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddSubject', undefined)}
            style={styles.addBtn}>
            <Text style={styles.addBtnText}>＋ Add</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={subjects}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <SubjectCard
            subject={item}
            onEdit={() => navigation.navigate('AddSubject', {subjectId: item.id})}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📚"
            title="No subjects yet"
            subtitle="Add your first subject to get started with your study planner"
            actionLabel="Add Subject"
            onAction={() => navigation.navigate('AddSubject', undefined)}
          />
        }
        refreshing={isLoading || isDeleting}
        onRefresh={refetch}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.BG_DEEP},
  list: {padding: SPACING.MD, paddingBottom: SPACING.XXL},
  addBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: 8,
  },
  addBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
});

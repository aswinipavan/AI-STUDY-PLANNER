import React, {useState} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useActiveTimetable, useToggleSlot, useGenerateTimetable} from '@/hooks/useTimetable';
import {DaySelector} from '@/components/timetable/DaySelector';
import {SlotCard} from '@/components/timetable/SlotCard';
import {LoadingSpinner} from '@/components/common/LoadingSpinner';
import {EmptyState} from '@/components/common/EmptyState';
import {ErrorState} from '@/components/common/ErrorState';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {Button} from '@/components/common/Button';
import {Card} from '@/components/common/Card';
import {COLORS} from '@/constants/colors';
import {SPACING} from '@/constants/theme';
import {getTodayDayOfWeek, getDayLabel} from '@/utils/dateUtils';
import type {SlotResponse} from '@/types/timetable.types';

export function TimetableScreen() {
  const todayIndex = getTodayDayOfWeek();
  const [selectedDay, setSelectedDay] = useState(todayIndex);

  const {
    data: timetable,
    isLoading,
    error,
    refetch,
  } = useActiveTimetable();

  const {mutate: toggleSlot, isPending: isToggling, variables: togglingSlotId} = useToggleSlot();
  const {mutate: generateTimetable, isPending: isGenerating} = useGenerateTimetable();

  // Days that have at least one slot
  const activeDays: number[] = Array.from(new Set((timetable?.slots ?? []).map((s: SlotResponse) => s.dayOfWeek)));


  // Slots for selected day, sorted by start time
  const daySlots: SlotResponse[] = (timetable?.slots ?? [])
    .filter((s: SlotResponse) => s.dayOfWeek === selectedDay)
    .sort((a: SlotResponse, b: SlotResponse) => a.startTime.localeCompare(b.startTime));

  const completedCount = daySlots.filter((s: SlotResponse) => s.isCompleted).length;

  const handleGenerate = () => {
    Alert.alert(
      'Generate AI Timetable',
      'This will create an AI-optimised timetable based on your subjects and study hours. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Generate',
          onPress: () =>
            generateTimetable(
              {},
              {
                onSuccess: () =>
                  Alert.alert('✅ Done', 'Your AI timetable has been created!'),
                onError: () =>
                  Alert.alert('Error', 'Failed to generate timetable. Please try again.'),
              },
            ),
        },
      ],
    );
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading timetable…" />;
  }

  if (error && !timetable) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Timetable"
        subtitle={timetable ? `Week of ${timetable.weekStartDate}` : undefined}
        rightElement={
          <Button
            label="AI Generate"
            onPress={handleGenerate}
            loading={isGenerating}
            variant="secondary"
            size="sm"
          />
        }
      />

      {/* Day selector */}
      <DaySelector
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        activeDays={activeDays}
      />

      {/* Day label + progress */}
      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{getDayLabel(selectedDay)}</Text>
        {daySlots.length > 0 && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>
              {completedCount}/{daySlots.length} done
            </Text>
          </View>
        )}
      </View>

      {!timetable ? (
        <EmptyState
          icon="📅"
          title="No timetable yet"
          subtitle="Generate an AI-powered timetable or create your own schedule"
          actionLabel="Generate AI Timetable"
          onAction={handleGenerate}
        />
      ) : daySlots.length === 0 ? (
        <View style={styles.emptyDay}>
          <Card>
            <Text style={styles.emptyDayText}>
              🌟 No sessions scheduled for {getDayLabel(selectedDay)}.
            </Text>
          </Card>
        </View>
      ) : (
        <FlatList
          data={daySlots}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({item}) => (
            <SlotCard
              slot={item}
              onToggle={() => toggleSlot(item.id)}
              isToggling={isToggling && togglingSlotId === item.id}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.BG_DEEP},
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.SM,
    paddingBottom: SPACING.XS,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
  },
  progressBadge: {
    backgroundColor: COLORS.SECONDARY + '22',
    borderRadius: 20,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.SECONDARY,
  },
  list: {padding: SPACING.MD, paddingBottom: SPACING.XXL},
  emptyDay: {padding: SPACING.MD},
  emptyDayText: {
    textAlign: 'center',
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    paddingVertical: SPACING.SM,
  },
});

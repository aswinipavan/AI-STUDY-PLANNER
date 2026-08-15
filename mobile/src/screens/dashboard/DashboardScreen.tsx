import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {useAuthStore} from '@/stores/authStore';
import {useUpcomingExams} from '@/hooks/useExams';
import {useActiveTimetable} from '@/hooks/useTimetable';
import {Card} from '@/components/common/Card';
import {LoadingSpinner} from '@/components/common/LoadingSpinner';
import {ErrorState} from '@/components/common/ErrorState';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import type {SlotResponse} from '@/types/timetable.types';
import {
  getTodayDayOfWeek,
  formatExamCountdown,
  formatDate,
  formatTimeRange,
} from '@/utils/dateUtils';
import {useNavigation} from '@react-navigation/native';

export function DashboardScreen() {
  const student = useAuthStore(s => s.student);
  const navigation = useNavigation<any>();
  const todayIndex = getTodayDayOfWeek();

  const {
    data: timetable,
    isLoading: timetableLoading,
    error: timetableError,
    refetch: refetchTimetable,
  } = useActiveTimetable();

  const {
    data: upcomingExams,
    isLoading: examsLoading,
    refetch: refetchExams,
  } = useUpcomingExams();

  const isLoading = timetableLoading || examsLoading;
  const onRefresh = () => {
    refetchTimetable();
    refetchExams();
  };

  const todaySlots: SlotResponse[] =
    timetable?.slots.filter((s: SlotResponse) => s.dayOfWeek === todayIndex) ?? [];
  const completedToday = todaySlots.filter((s: SlotResponse) => s.isCompleted).length;
  const nextExam = upcomingExams?.[0];

  const firstName = student?.fullName?.split(' ')[0] ?? 'Student';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={COLORS.PRIMARY}
        />
      }>
      {/* ── Greeting ── */}
      <View style={styles.greeting}>
        <Text style={styles.greetText}>
          {getGreeting()}, {firstName} 👋
        </Text>
        <Text style={styles.greetSub}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {/* ── Stat cards ── */}
      <View style={styles.statRow}>
        <StatCard
          icon="🔥"
          label="Study Streak"
          value={`${student?.studyStreak ?? 0}`}
          unit="days"
          color={COLORS.WARNING}
        />
        <StatCard
          icon="✅"
          label="Done Today"
          value={`${completedToday}/${todaySlots.length}`}
          unit="slots"
          color={COLORS.SECONDARY}
        />
        <StatCard
          icon="⏳"
          label="Hours/Day"
          value={`${student?.availableHoursPerDay ?? 4}`}
          unit="hrs"
          color={COLORS.PRIMARY}
        />
      </View>

      {/* ── Next Exam ── */}
      {nextExam && (
        <Card style={styles.examBanner}>
          <View style={styles.examBannerRow}>
            <View>
              <Text style={styles.examBannerLabel}>📝 Next Exam</Text>
              <Text style={styles.examBannerName} numberOfLines={1}>
                {nextExam.examName ?? nextExam.subject.subjectName}
              </Text>
              <Text style={styles.examBannerDate}>
                {formatDate(nextExam.examDate)}
              </Text>
            </View>
            <View
              style={[
                styles.countdownBadge,
                nextExam.daysRemaining <= 3 && styles.countdownUrgent,
              ]}>
              <Text style={styles.countdownText}>
                {formatExamCountdown(nextExam.daysRemaining)}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* ── Today's Schedule ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Timetable')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {timetableError ? (
        <ErrorState error={timetableError} onRetry={refetchTimetable} />
      ) : timetableLoading ? (
        <LoadingSpinner message="Loading timetable…" />
      ) : todaySlots.length === 0 ? (
        <Card style={styles.emptySlots}>
          <Text style={styles.emptySlotsText}>
            🌟 No slots scheduled for today. Enjoy your day!
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Timetable')}
            style={styles.generateBtn}>
            <Text style={styles.generateBtnText}>Generate Timetable</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        todaySlots.slice(0, 3).map((slot: SlotResponse) => (
          <Card key={slot.id} style={styles.slotRow}>
            <View style={styles.slotLeft}>
              <View
                style={[
                  styles.slotDot,
                  slot.isCompleted && styles.slotDotDone,
                ]}
              />
              <View>
                <Text style={styles.slotSubject} numberOfLines={1}>
                  {slot.subject.subjectName}
                </Text>
                <Text style={styles.slotTime}>
                  {formatTimeRange(slot.startTime, slot.endTime)}
                </Text>
                {slot.topic && (
                  <Text style={styles.slotTopic} numberOfLines={1}>
                    {slot.topic}
                  </Text>
                )}
              </View>
            </View>
            {slot.isCompleted && (
              <Text style={styles.slotCheck}>✓</Text>
            )}
          </Card>
        ))
      )}

      {/* ── Quick actions ── */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {[
          {icon: '📚', label: 'Subjects', screen: 'Subjects'},
          {icon: '📅', label: 'Timetable', screen: 'Timetable'},
          {icon: '📝', label: 'Exams', screen: 'Exams'},
          {icon: '🤖', label: 'AI Tutor', screen: 'AI'},
          {icon: '📁', label: 'Materials', screen: 'Materials'},
          {icon: '📊', label: 'Analytics', screen: 'Analytics'},
        ].map(({icon, label, screen}) => (
          <TouchableOpacity
            key={label}
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate(screen)}
            activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>{icon}</Text>
            <Text style={styles.quickActionLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {return 'Good morning';}
  if (hour < 17) {return 'Good afternoon';}
  return 'Good evening';
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  unit: string;
  color: string;
}
function StatCard({icon, label, value, unit, color}: StatCardProps) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, {color}]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.BG_DEEP},
  content: {padding: SPACING.MD, paddingBottom: SPACING.XXL},
  greeting: {marginBottom: SPACING.LG, paddingTop: SPACING.MD},
  greetText: {fontSize: 24, fontWeight: '800', color: COLORS.TEXT_PRIMARY},
  greetSub: {fontSize: 14, color: COLORS.TEXT_SECONDARY, marginTop: 4},

  statRow: {flexDirection: 'row', gap: SPACING.SM, marginBottom: SPACING.LG},
  statCard: {flex: 1, alignItems: 'center', paddingVertical: SPACING.MD},
  statIcon: {fontSize: 22, marginBottom: 4},
  statValue: {fontSize: 22, fontWeight: '800'},
  statUnit: {fontSize: 11, color: COLORS.TEXT_MUTED, marginTop: 2},
  statLabel: {fontSize: 11, color: COLORS.TEXT_SECONDARY, marginTop: 2, textAlign: 'center'},

  examBanner: {
    marginBottom: SPACING.LG,
    backgroundColor: COLORS.PRIMARY + '18',
    borderColor: COLORS.PRIMARY + '44',
  },
  examBannerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  examBannerLabel: {fontSize: 12, color: COLORS.TEXT_MUTED, fontWeight: '600', marginBottom: 4},
  examBannerName: {fontSize: 17, fontWeight: '700', color: COLORS.TEXT_PRIMARY, maxWidth: 200},
  examBannerDate: {fontSize: 13, color: COLORS.TEXT_SECONDARY, marginTop: 2},
  countdownBadge: {backgroundColor: COLORS.PRIMARY_GLOW, borderRadius: RADIUS.LG, paddingHorizontal: SPACING.MD, paddingVertical: SPACING.SM},
  countdownUrgent: {backgroundColor: COLORS.DANGER + '22'},
  countdownText: {fontSize: 13, fontWeight: '700', color: COLORS.PRIMARY_LIGHT},

  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.SM},
  sectionTitle: {fontSize: 17, fontWeight: '700', color: COLORS.TEXT_PRIMARY, marginBottom: SPACING.SM, marginTop: SPACING.MD},
  seeAll: {fontSize: 13, color: COLORS.PRIMARY, fontWeight: '600'},

  emptySlots: {alignItems: 'center', paddingVertical: SPACING.LG},
  emptySlotsText: {color: COLORS.TEXT_SECONDARY, textAlign: 'center', fontSize: 14},
  generateBtn: {marginTop: SPACING.MD, paddingHorizontal: SPACING.LG, paddingVertical: SPACING.SM, backgroundColor: COLORS.PRIMARY, borderRadius: RADIUS.MD},
  generateBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},

  slotRow: {marginBottom: SPACING.SM, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  slotLeft: {flexDirection: 'row', alignItems: 'flex-start', flex: 1},
  slotDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.PRIMARY, marginTop: 5, marginRight: SPACING.SM},
  slotDotDone: {backgroundColor: COLORS.SECONDARY},
  slotSubject: {fontSize: 15, fontWeight: '700', color: COLORS.TEXT_PRIMARY},
  slotTime: {fontSize: 12, color: COLORS.TEXT_SECONDARY, marginTop: 2},
  slotTopic: {fontSize: 11, color: COLORS.TEXT_MUTED, marginTop: 2, fontStyle: 'italic'},
  slotCheck: {fontSize: 18, color: COLORS.SECONDARY},

  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
    marginTop: SPACING.SM,
  },
  quickActionBtn: {
    flexBasis: '31%',
    backgroundColor: COLORS.BG_SURFACE,
    borderRadius: RADIUS.LG,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.XS,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  quickActionIcon: {fontSize: 24, marginBottom: SPACING.XS},
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});


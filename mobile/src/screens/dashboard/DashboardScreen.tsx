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
import {usePrioritySubjects} from '@/hooks/usePerformance';
import {Card} from '@/components/common/Card';
import {LoadingSpinner} from '@/components/common/LoadingSpinner';
import {ErrorState} from '@/components/common/ErrorState';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import type {SlotResponse} from '@/types/timetable.types';
import type {ExamResponse} from '@/types/exam.types';
import type {SubjectResponse} from '@/types/student.types';
import {
  formatDate,
  formatTimeRange,
} from '@/utils/dateUtils';
import {
  computeDayStudyStats,
  calculateSlotDuration,
  getLocalDateString,
  resolveMobileSubjectName,
  PrioritySubjectMobile,
} from '@/utils/dashboardStats';
import {useNavigation} from '@react-navigation/native';

export function DashboardScreen() {
  const student = useAuthStore(s => s.student);
  const navigation = useNavigation<any>();

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

  const {
    data: prioritySubjects,
    isLoading: priorityLoading,
    refetch: refetchPriority,
  } = usePrioritySubjects();

  const isLoading = timetableLoading || examsLoading || priorityLoading;
  const onRefresh = () => {
    refetchTimetable();
    refetchExams();
    refetchPriority();
  };

  const today = new Date();
  const todayIso = getLocalDateString(today);
  const stats = computeDayStudyStats(
    timetable?.slots,
    today,
    upcomingExams || [],
    prioritySubjects || []
  );

  const {
    todaySlots,
    completedSessions: completedToday,
    totalSessions: totalToday,
    highPrioritySessions,
    catchUpSessions,
    plannedStudyTime,
    completedStudyTime,
    completionRate,
    categorizedSlots,
    nextBestAction,
  } = stats;

  const sortedExams: ExamResponse[] = (upcomingExams || [])
    .filter((e: ExamResponse) => Boolean(e.examDate))
    .sort((a: ExamResponse, b: ExamResponse) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
  const nextExam = sortedExams[0];
  const firstName = student?.fullName?.split(' ')[0] ?? 'Student';

  // Historical uncompleted missed slots across timetable
  const missedSlots: SlotResponse[] = (timetable?.slots || []).filter((s: SlotResponse) => {
    if (s.isCompleted || s.status === 'completed') {return false;}
    if (s.status === 'missed') {return true;}
    if (s.date) {
      const d = s.date.split('T')[0];
      return d < todayIso;
    }
    return false;
  });

  // Exam Readiness Calculation from Real Data
  const examReadinessList = sortedExams.slice(0, 3).map((exam: ExamResponse) => {
    const subName = exam.subject?.subjectName || exam.examName || '';
    const matchedPriority = (prioritySubjects || []).find(
      (p: SubjectResponse | PrioritySubjectMobile) => p.subjectName.toLowerCase() === subName.toLowerCase()
    ) as PrioritySubjectMobile | undefined;
    const subjectSlots = (timetable?.slots || []).filter(
      (s: SlotResponse) => resolveMobileSubjectName(s).toLowerCase() === subName.toLowerCase()
    );
    const completedSubjectSlots = subjectSlots.filter(
      (s: SlotResponse) => s.isCompleted || s.status === 'completed'
    ).length;
    const totalSubjectSlots = subjectSlots.length;
    const slotCoverageRate =
      totalSubjectSlots > 0
        ? Math.round((completedSubjectSlots / totalSubjectSlots) * 100)
        : 0;

    const avgScore =
      matchedPriority?.averagePercentage != null
        ? Math.round(matchedPriority.averagePercentage)
        : null;
    const daysLeft =
      exam.daysRemaining ??
      Math.ceil(
        (new Date(exam.examDate + 'T00:00:00').getTime() -
          new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

    let readinessScore =
      avgScore != null
        ? Math.round(avgScore * 0.6 + slotCoverageRate * 0.4)
        : slotCoverageRate > 0
        ? slotCoverageRate
        : 50;
    readinessScore = Math.min(100, Math.max(10, readinessScore));

    let tierLabel = 'Preparing';
    let tierColor: string = COLORS.WARNING;
    if (readinessScore >= 80) {
      tierLabel = 'Exam Ready';
      tierColor = COLORS.SUCCESS;
    } else if (readinessScore >= 60) {
      tierLabel = 'On Track';
      tierColor = COLORS.INFO;
    } else {
      tierLabel = 'Needs Focus';
      tierColor = COLORS.WARNING;
    }

    return {
      id: exam.id,
      examName: exam.examName || 'Upcoming Exam',
      subjectName: subName || 'Academic Course',
      daysLeft,
      avgScore,
      completedSubjectSlots,
      totalSubjectSlots,
      readinessScore,
      tierLabel,
      tierColor,
    };
  });

  // Weak Areas triage from real priority list
  const weakSubjectsList = (prioritySubjects || [])
    .filter(
      (p: SubjectResponse | PrioritySubjectMobile) => {
        const pObj = p as PrioritySubjectMobile;
        return (
          (pObj.averagePercentage != null && pObj.averagePercentage < 65) ||
          pObj.priorityLevel === 'HIGH'
        );
      }
    )
    .slice(0, 3);

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
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI STUDY INTELLIGENCE</Text>
        </View>
        <Text style={styles.greetText}>
          {getGreeting()}, {firstName}
        </Text>
        <Text style={styles.greetSub}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {/* ── Real Daily Overview Metrics Pills ── */}
      <View style={styles.overviewMetricsRow}>
        <View style={[styles.metricPill, styles.metricPillPrimary]}>
          <Text style={[styles.metricPillText, styles.metricPillTextPrimary]}>
            {totalToday} session{totalToday === 1 ? '' : 's'}
          </Text>
        </View>
        {highPrioritySessions > 0 && (
          <View style={[styles.metricPill, styles.metricPillWarning]}>
            <Text style={[styles.metricPillText, styles.metricPillTextWarning]}>
              {highPrioritySessions} high-priority
            </Text>
          </View>
        )}
        {catchUpSessions > 0 && (
          <View style={[styles.metricPill, styles.metricPillDanger]}>
            <Text style={[styles.metricPillText, styles.metricPillTextDanger]}>
              {catchUpSessions} catch-up
            </Text>
          </View>
        )}
        <View style={styles.metricPill}>
          <Text style={styles.metricPillText}>
            {plannedStudyTime.value} planned
          </Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricPillText}>
            {completedStudyTime.value} completed
          </Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricPillText}>
            {nextExam ? `Exam in ${nextExam.daysRemaining}d` : 'No exams'}
          </Text>
        </View>
      </View>

      {/* ── Missed Sessions Alert (if historical missed slots exist) ── */}
      {missedSlots.length > 0 && (
        <Card style={styles.missedAlertCard}>
          <View style={styles.missedAlertHeader}>
            <Text style={styles.missedAlertTitle}>
              {missedSlots.length} Missed Session{missedSlots.length === 1 ? '' : 's'} Require Catch-Up
            </Text>
            <Text style={styles.missedAlertDesc}>
              Past uncompleted sessions have been carried forward. Complete them today to protect your streak.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Timetable')}
              style={styles.missedAlertBtn}
              activeOpacity={0.8}>
              <Text style={styles.missedAlertBtnText}>Catch Up in Timetable →</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* ── YOUR NEXT BEST ACTION HERO CARD ── */}
      <Card style={styles.nextActionCard}>
        <View style={styles.nextActionHeader}>
          <View style={styles.nextActionBadge}>
            <Text style={styles.nextActionBadgeText}>YOUR NEXT BEST ACTION</Text>
          </View>
          {nextBestAction.timeRange && (
            <View style={styles.timeRangeBadge}>
              <Text style={styles.timeRangeText}>
                {nextBestAction.timeRange}
                {nextBestAction.durationMinutes ? ` · ${nextBestAction.durationMinutes}m` : ''}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.nextActionTitle}>
          {nextBestAction.actionTitle}: {nextBestAction.targetName}
        </Text>

        {nextBestAction.topic && (
          <Text style={styles.nextActionTopic}>
            📖 {nextBestAction.topic}
          </Text>
        )}

        <View style={styles.reasonsContainer}>
          <Text style={styles.reasonsHeader}>WHY THIS ACTION NOW:</Text>
          {nextBestAction.reasons.map((reason, idx) => (
            <View key={idx} style={styles.reasonRow}>
              <View style={styles.reasonBullet} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.btnPrimaryAction}
            onPress={() => navigation.navigate(nextBestAction.screen || 'Timetable')}
            activeOpacity={0.8}>
            <Text style={styles.btnPrimaryActionText}>
              {nextBestAction.type === 'ACTIVE_NOW'
                ? '⚡ Open in Timetable'
                : nextBestAction.type === 'CATCH_UP'
                ? '📌 Catch Up in Timetable'
                : '📅 View Timetable'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondaryAction}
            onPress={() => navigation.navigate('AI')}
            activeOpacity={0.8}>
            <Text style={styles.btnSecondaryActionText}>🤖 Study with AI Tutor</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── TODAY'S PROGRESS & STUDY HABIT BREAKDOWN ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today&apos;s Progress & Study Habit</Text>
      </View>
      <View style={styles.progressGrid}>
        <View style={styles.progressBox}>
          <Text style={styles.progressLabel}>Planned Time</Text>
          <Text style={styles.progressValue}>{plannedStudyTime.formatted}</Text>
          <Text style={styles.progressSub}>{totalToday} session{totalToday === 1 ? '' : 's'}</Text>
        </View>
        <View style={styles.progressBox}>
          <Text style={styles.progressLabel}>Completed Time</Text>
          <Text style={[styles.progressValue, {color: COLORS.SUCCESS}]}>
            {completedStudyTime.formatted}
          </Text>
          <Text style={styles.progressSub}>{completedToday} completed</Text>
        </View>
        <View style={styles.progressBox}>
          <Text style={styles.progressLabel}>Completion Rate</Text>
          <Text style={[styles.progressValue, {color: COLORS.PRIMARY_LIGHT}]}>
            {completionRate}%
          </Text>
          <Text style={styles.progressSub}>Daily goal</Text>
        </View>
        <View style={styles.progressBox}>
          <Text style={styles.progressLabel}>Study Streak</Text>
          <Text style={[styles.progressValue, {color: COLORS.WARNING}]}>
            {student?.studyStreak ?? 0}d
          </Text>
          <Text style={styles.progressSub}>Active streak</Text>
        </View>
      </View>

      {/* ── EXAM READINESS MODULE ── */}
      {examReadinessList.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exam Readiness</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Exams')}>
              <Text style={styles.seeAll}>All Exams →</Text>
            </TouchableOpacity>
          </View>
          {examReadinessList.map(item => (
            <Card key={item.id} style={styles.readinessCard}>
              <View style={styles.readinessHeader}>
                <View style={{flex: 1}}>
                  <Text style={styles.readinessSubject}>{item.subjectName}</Text>
                  <Text style={styles.readinessExam}>
                    {item.examName} · in {item.daysLeft}d
                  </Text>
                </View>
                <View
                  style={[
                    styles.readinessPill,
                    {backgroundColor: item.tierColor + '22', borderColor: item.tierColor},
                  ]}>
                  <Text style={[styles.readinessPillText, {color: item.tierColor}]}>
                    {item.tierLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.readinessMetrics}>
                <Text style={styles.readinessMetricText}>
                  {item.avgScore != null ? `${item.avgScore}% Avg Marks` : 'No marks logged'}
                </Text>
                <Text style={styles.readinessMetricText}>
                  {item.totalSubjectSlots > 0
                    ? `${item.completedSubjectSlots}/${item.totalSubjectSlots} Done`
                    : 'No sessions planned'}
                </Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {width: `${item.readinessScore}%`, backgroundColor: item.tierColor},
                  ]}
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* ── WEAK AREAS & PRIORITY FOCUS ── */}
      {weakSubjectsList.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weak Areas & Priority Focus</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
              <Text style={styles.seeAll}>Analytics →</Text>
            </TouchableOpacity>
          </View>
          {weakSubjectsList.map((item: any) => (
            <Card key={item.id} style={styles.weakAreaCard}>
              <View style={styles.weakAreaHeader}>
                <Text style={styles.weakAreaSubject}>{item.subjectName}</Text>
                <View style={styles.weakAreaScoreBadge}>
                  <Text style={styles.weakAreaScoreText}>
                    {item.averagePercentage != null
                      ? `${Math.round(item.averagePercentage)}% avg`
                      : 'High Priority'}
                  </Text>
                </View>
              </View>
              <Text style={styles.weakAreaReason}>
                {item.reasons && item.reasons.length > 0
                  ? item.reasons[0]
                  : 'High complexity course requiring focused review.'}
              </Text>
              <TouchableOpacity
                style={styles.weakAreaBtn}
                onPress={() => navigation.navigate('AI')}
                activeOpacity={0.8}>
                <Text style={styles.weakAreaBtnText}>🤖 Study with AI Tutor →</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      )}

      {/* ── CATEGORIZED TODAY'S SCHEDULE ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Timetable')}>
          <Text style={styles.seeAll}>Full Calendar →</Text>
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
        <View>
          {/* Current Active Session */}
          {categorizedSlots.current && (
            <View style={styles.scheduleGroup}>
              <Text style={[styles.scheduleGroupTitle, {color: COLORS.SUCCESS}]}>
                ⚡ Current Session (Active Now)
              </Text>
              <Card style={[styles.slotCardHighlight, {borderColor: COLORS.SUCCESS}]}>
                <View style={styles.slotRow}>
                  <View style={styles.slotLeft}>
                    <View style={[styles.slotDot, {backgroundColor: COLORS.SUCCESS}]} />
                    <View style={{flex: 1}}>
                      <Text style={styles.slotSubject} numberOfLines={1}>
                        {resolveMobileSubjectName(categorizedSlots.current)}
                      </Text>
                      <Text style={styles.slotTime}>
                        {formatTimeRange(
                          categorizedSlots.current.startTime,
                          categorizedSlots.current.endTime
                        )}{' '}
                        · {calculateSlotDuration(categorizedSlots.current)}m · active now
                      </Text>
                      {categorizedSlots.current.topic && (
                        <Text style={styles.slotTopic} numberOfLines={1}>
                          📖 {categorizedSlots.current.topic}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </Card>
            </View>
          )}

          {/* Upcoming Sessions */}
          {categorizedSlots.upcoming.length > 0 && (
            <View style={styles.scheduleGroup}>
              <Text style={styles.scheduleGroupTitle}>
                ⏳ Upcoming Today ({categorizedSlots.upcoming.length})
              </Text>
              {categorizedSlots.upcoming.map((slot: SlotResponse) => (
                <Card key={slot.id} style={styles.slotRow}>
                  <View style={styles.slotLeft}>
                    <View style={styles.slotDot} />
                    <View style={{flex: 1}}>
                      <Text style={styles.slotSubject} numberOfLines={1}>
                        {resolveMobileSubjectName(slot)}
                      </Text>
                      <Text style={styles.slotTime}>
                        {formatTimeRange(slot.startTime, slot.endTime)} ·{' '}
                        {calculateSlotDuration(slot)}m
                      </Text>
                      {slot.topic && (
                        <Text style={styles.slotTopic} numberOfLines={1}>
                          📖 {slot.topic}
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* Past & Completed Sessions */}
          {categorizedSlots.past.length > 0 && (
            <View style={styles.scheduleGroup}>
              <Text style={[styles.scheduleGroupTitle, {color: COLORS.TEXT_MUTED}]}>
                ✅ Past & Completed ({categorizedSlots.past.length})
              </Text>
              {categorizedSlots.past.map((slot: SlotResponse) => {
                const isDone = slot.isCompleted || slot.status === 'completed';
                return (
                  <Card key={slot.id} style={styles.slotRow}>
                    <View style={styles.slotLeft}>
                      <View
                        style={[
                          styles.slotDot,
                          isDone ? styles.slotDotDone : styles.slotDotMissed,
                        ]}
                      />
                      <View style={{flex: 1}}>
                        <Text style={styles.slotSubject} numberOfLines={1}>
                          {resolveMobileSubjectName(slot)}
                        </Text>
                        <Text style={styles.slotTime}>
                          {formatTimeRange(slot.startTime, slot.endTime)} ·{' '}
                          {calculateSlotDuration(slot)}m · {isDone ? 'completed' : 'missed'}
                        </Text>
                        {slot.topic && (
                          <Text style={styles.slotTopic} numberOfLines={1}>
                            📖 {slot.topic}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isDone && <Text style={styles.slotCheck}>✓</Text>}
                  </Card>
                );
              })}
            </View>
          )}
        </View>
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

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.BG_DEEP},
  content: {padding: SPACING.MD, paddingBottom: SPACING.XXL},
  greeting: {marginBottom: SPACING.MD, paddingTop: SPACING.SM},
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.PRIMARY_GLOW,
    borderColor: COLORS.PRIMARY,
    borderWidth: 1,
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    marginBottom: SPACING.XS,
  },
  aiBadgeText: {fontSize: 11, fontWeight: '700', color: COLORS.PRIMARY_LIGHT},
  greetText: {fontSize: 24, fontWeight: '800', color: COLORS.TEXT_PRIMARY},
  greetSub: {fontSize: 13, color: COLORS.TEXT_SECONDARY, marginTop: 2},

  overviewMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.XS,
    marginBottom: SPACING.LG,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BG_SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
  },
  metricPillPrimary: {
    borderColor: COLORS.PRIMARY + '66',
    backgroundColor: COLORS.PRIMARY + '14',
  },
  metricPillWarning: {
    borderColor: COLORS.WARNING + '66',
    backgroundColor: COLORS.WARNING + '14',
  },
  metricPillDanger: {
    borderColor: COLORS.DANGER + '66',
    backgroundColor: COLORS.DANGER + '14',
  },
  metricPillText: {fontSize: 11, fontWeight: '600', color: COLORS.TEXT_SECONDARY},
  metricPillTextPrimary: {color: COLORS.PRIMARY_LIGHT, fontWeight: '700'},
  metricPillTextWarning: {color: COLORS.WARNING, fontWeight: '700'},
  metricPillTextDanger: {color: COLORS.DANGER, fontWeight: '700'},

  missedAlertCard: {
    marginBottom: SPACING.LG,
    backgroundColor: COLORS.DANGER + '14',
    borderColor: COLORS.DANGER + '55',
    borderWidth: 1,
  },
  missedAlertHeader: {padding: SPACING.XS},
  missedAlertTitle: {fontSize: 14, fontWeight: '800', color: COLORS.DANGER, marginBottom: 4},
  missedAlertDesc: {fontSize: 12, color: COLORS.TEXT_SECONDARY, lineHeight: 16, marginBottom: SPACING.SM},
  missedAlertBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.DANGER,
    borderRadius: RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
  },
  missedAlertBtnText: {color: '#fff', fontSize: 12, fontWeight: '700'},

  nextActionCard: {
    marginBottom: SPACING.LG,
    backgroundColor: COLORS.BG_SURFACE,
    borderColor: COLORS.PRIMARY + '55',
    borderWidth: 1,
    padding: SPACING.MD,
  },
  nextActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  nextActionBadge: {
    backgroundColor: COLORS.PRIMARY_GLOW,
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 3,
  },
  nextActionBadgeText: {fontSize: 10, fontWeight: '800', color: COLORS.PRIMARY_LIGHT, letterSpacing: 0.5},
  timeRangeBadge: {
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.MD,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  timeRangeText: {fontSize: 11, color: COLORS.TEXT_SECONDARY, fontWeight: '600'},
  nextActionTitle: {fontSize: 18, fontWeight: '800', color: COLORS.TEXT_PRIMARY, marginBottom: 4},
  nextActionTopic: {fontSize: 13, color: COLORS.PRIMARY_LIGHT, fontWeight: '600', marginBottom: SPACING.SM},
  reasonsContainer: {
    backgroundColor: COLORS.BG_ELEVATED,
    borderRadius: RADIUS.MD,
    padding: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  reasonsHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.TEXT_MUTED,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  reasonRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4},
  reasonBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.PRIMARY,
    marginTop: 6,
    marginRight: SPACING.SM,
  },
  reasonText: {fontSize: 12, color: COLORS.TEXT_SECONDARY, flex: 1, lineHeight: 16},
  actionButtonsRow: {flexDirection: 'row', gap: SPACING.SM},
  btnPrimaryAction: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: RADIUS.MD,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
  },
  btnPrimaryActionText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  btnSecondaryAction: {
    flex: 1,
    backgroundColor: COLORS.BG_ELEVATED,
    borderColor: COLORS.BG_BORDER,
    borderWidth: 1,
    borderRadius: RADIUS.MD,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
  },
  btnSecondaryActionText: {color: COLORS.TEXT_PRIMARY, fontSize: 13, fontWeight: '600'},

  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  progressBox: {
    flexBasis: '48%',
    backgroundColor: COLORS.BG_SURFACE,
    borderColor: COLORS.BG_BORDER,
    borderWidth: 1,
    borderRadius: RADIUS.LG,
    padding: SPACING.MD,
    alignItems: 'center',
  },
  progressLabel: {fontSize: 11, color: COLORS.TEXT_MUTED, fontWeight: '600', marginBottom: 2},
  progressValue: {fontSize: 20, fontWeight: '800', color: COLORS.TEXT_PRIMARY, marginBottom: 2},
  progressSub: {fontSize: 10, color: COLORS.TEXT_SECONDARY},

  sectionBlock: {marginBottom: SPACING.LG},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  sectionTitle: {fontSize: 16, fontWeight: '800', color: COLORS.TEXT_PRIMARY},
  seeAll: {fontSize: 12, color: COLORS.PRIMARY_LIGHT, fontWeight: '600'},

  readinessCard: {
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.BG_SURFACE,
    borderColor: COLORS.BG_BORDER,
    borderWidth: 1,
    padding: SPACING.MD,
  },
  readinessHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.SM},
  readinessSubject: {fontSize: 15, fontWeight: '700', color: COLORS.TEXT_PRIMARY},
  readinessExam: {fontSize: 12, color: COLORS.TEXT_SECONDARY, marginTop: 2},
  readinessPill: {
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderWidth: 1,
  },
  readinessPillText: {fontSize: 10, fontWeight: '800'},
  readinessMetrics: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6},
  readinessMetricText: {fontSize: 11, color: COLORS.TEXT_MUTED, fontWeight: '600'},
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.BG_ELEVATED,
    overflow: 'hidden',
  },
  progressBarFill: {height: '100%', borderRadius: 3},

  weakAreaCard: {
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.BG_SURFACE,
    borderColor: COLORS.WARNING + '44',
    borderWidth: 1,
    padding: SPACING.MD,
  },
  weakAreaHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
  weakAreaSubject: {fontSize: 15, fontWeight: '700', color: COLORS.TEXT_PRIMARY},
  weakAreaScoreBadge: {
    backgroundColor: COLORS.WARNING + '22',
    borderRadius: RADIUS.MD,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  weakAreaScoreText: {fontSize: 11, fontWeight: '700', color: COLORS.WARNING},
  weakAreaReason: {fontSize: 12, color: COLORS.TEXT_SECONDARY, lineHeight: 16, marginBottom: SPACING.SM},
  weakAreaBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.BG_ELEVATED,
    borderColor: COLORS.BG_BORDER,
    borderWidth: 1,
    borderRadius: RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
  },
  weakAreaBtnText: {fontSize: 12, fontWeight: '600', color: COLORS.PRIMARY_LIGHT},

  emptySlots: {alignItems: 'center', paddingVertical: SPACING.LG},
  emptySlotsText: {color: COLORS.TEXT_SECONDARY, textAlign: 'center', fontSize: 14},
  generateBtn: {
    marginTop: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: RADIUS.MD,
  },
  generateBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},

  scheduleGroup: {marginBottom: SPACING.MD},
  scheduleGroupTitle: {fontSize: 12, fontWeight: '700', color: COLORS.TEXT_SECONDARY, marginBottom: SPACING.XS},
  slotCardHighlight: {backgroundColor: COLORS.BG_SURFACE, borderWidth: 1, marginBottom: SPACING.SM},
  slotRow: {marginBottom: SPACING.SM, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  slotLeft: {flexDirection: 'row', alignItems: 'flex-start', flex: 1},
  slotDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.PRIMARY, marginTop: 5, marginRight: SPACING.SM},
  slotDotDone: {backgroundColor: COLORS.SUCCESS},
  slotDotMissed: {backgroundColor: COLORS.DANGER},
  slotSubject: {fontSize: 15, fontWeight: '700', color: COLORS.TEXT_PRIMARY},
  slotTime: {fontSize: 12, color: COLORS.TEXT_SECONDARY, marginTop: 2},
  slotTopic: {fontSize: 11, color: COLORS.TEXT_MUTED, marginTop: 2, fontStyle: 'italic'},
  slotCheck: {fontSize: 18, color: COLORS.SUCCESS, fontWeight: '800'},

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


import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuthStore} from '@/stores/authStore';
import {useProfile, useUpdateProfile} from '@/hooks/useStudent';
import {Card} from '@/components/common/Card';
import {Button} from '@/components/common/Button';
import {Input} from '@/components/common/Input';
import {LoadingSpinner} from '@/components/common/LoadingSpinner';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {useNavigation} from '@react-navigation/native';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {getErrorMessage} from '@/utils/errorHandler';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const {student, logout} = useAuthStore();
  const {data: profile, isLoading} = useProfile();
  const {mutate: updateProfile, isPending: isUpdating} = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(student?.fullName ?? '');
  const [collegeName, setCollegeName] = useState(student?.collegeName ?? '');
  const [department, setDepartment] = useState(student?.department ?? '');
  const [semester, setSemester] = useState(student?.semester?.toString() ?? '');
  const [hoursPerDay, setHoursPerDay] = useState(
    student?.availableHoursPerDay?.toString() ?? '4',
  );

  const handleSave = () => {
    updateProfile(
      {
        fullName: fullName || undefined,
        collegeName: collegeName || undefined,
        department: department || undefined,
        semester: semester ? parseInt(semester, 10) : undefined,
        availableHoursPerDay: hoursPerDay ? parseFloat(hoursPerDay) : undefined,
      },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => Alert.alert('Error', getErrorMessage(err)),
      },
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Logout', style: 'destructive', onPress: logout},
    ]);
  };

  if (isLoading && !student) {
    return <LoadingSpinner fullScreen message="Loading profile…" />;
  }

  const displayStudent = profile ?? student;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Profile"
        rightElement={
          !editing ? (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar & email */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayStudent?.fullName?.[0]?.toUpperCase() ??
                displayStudent?.email?.[0]?.toUpperCase() ??
                '🎓'}
            </Text>
          </View>
          <Text style={styles.name}>
            {displayStudent?.fullName ?? 'Student'}
          </Text>
          <Text style={styles.email}>{displayStudent?.email}</Text>
          {displayStudent?.isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>⭐ Premium</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatChip label="Streak" value={`${displayStudent?.studyStreak ?? 0} 🔥`} />
          <StatChip label="Study Hours" value={`${displayStudent?.availableHoursPerDay ?? 4}h/day`} />
          {displayStudent?.semester && (
            <StatChip label="Semester" value={`Sem ${displayStudent.semester}`} />
          )}
        </View>

        {/* Edit form / display */}
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Personal Info</Text>

          {editing ? (
            <>
              <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
              <Input label="College / University" value={collegeName} onChangeText={setCollegeName} placeholder="College name" />
              <Input label="Department" value={department} onChangeText={setDepartment} placeholder="e.g. Computer Science" />
              <View style={styles.row}>
                <Input label="Semester" value={semester} onChangeText={setSemester} keyboardType="numeric" placeholder="e.g. 4" containerStyle={styles.halfInput} />
                <Input label="Study Hrs/Day" value={hoursPerDay} onChangeText={setHoursPerDay} keyboardType="numeric" placeholder="e.g. 6" containerStyle={styles.halfInput} />
              </View>
              <View style={styles.editActions}>
                <Button label="Cancel" onPress={() => setEditing(false)} variant="ghost" size="sm" style={styles.flex} />
                <Button label="Save" onPress={handleSave} loading={isUpdating} size="sm" style={styles.flex} />
              </View>
            </>
          ) : (
            <>
              <InfoRow label="Email" value={displayStudent?.email ?? '—'} />
              <InfoRow label="College" value={displayStudent?.collegeName ?? 'Not set'} />
              <InfoRow label="Department" value={displayStudent?.department ?? 'Not set'} />
              <InfoRow label="Phone" value={displayStudent?.phoneNumber ?? 'Not set'} />
            </>
          )}
        </Card>

        {/* Quick Management Links */}
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Quick Links</Text>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.navRowLabel}>⚙️ Settings & Notifications</Text>
            <Text style={styles.navRowArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => navigation.navigate('Subjects')}>
            <Text style={styles.navRowLabel}>📚 Manage Subjects</Text>
            <Text style={styles.navRowArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => navigation.navigate('Materials')}>
            <Text style={styles.navRowLabel}>📁 Study Materials</Text>
            <Text style={styles.navRowArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => navigation.navigate('Analytics')}>
            <Text style={styles.navRowLabel}>📊 Performance Analytics</Text>
            <Text style={styles.navRowArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* Logout */}
        <Button
          label="Sign Out"
          onPress={handleLogout}
          variant="danger"
          size="lg"
          style={styles.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}


function StatChip({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.BG_DEEP},
  content: {padding: SPACING.MD, paddingBottom: SPACING.XXL},
  editLink: {color: COLORS.PRIMARY, fontWeight: '700', fontSize: 15},

  avatarSection: {alignItems: 'center', marginBottom: SPACING.LG, paddingTop: SPACING.MD},
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.MD,
  },
  avatarText: {fontSize: 36, fontWeight: '800', color: '#fff'},
  name: {fontSize: 22, fontWeight: '800', color: COLORS.TEXT_PRIMARY},
  email: {fontSize: 14, color: COLORS.TEXT_SECONDARY, marginTop: 4},
  premiumBadge: {
    backgroundColor: COLORS.WARNING + '22',
    borderRadius: RADIUS.FULL,
    paddingHorizontal: SPACING.MD,
    paddingVertical: 4,
    marginTop: SPACING.SM,
  },
  premiumText: {color: COLORS.WARNING, fontWeight: '700', fontSize: 13},

  statsRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  statChip: {
    flex: 1,
    backgroundColor: COLORS.BG_SURFACE,
    borderRadius: RADIUS.MD,
    padding: SPACING.SM,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BG_BORDER,
  },
  statValue: {fontSize: 15, fontWeight: '800', color: COLORS.TEXT_PRIMARY},
  statLabel: {fontSize: 11, color: COLORS.TEXT_MUTED, marginTop: 2},

  infoCard: {marginBottom: SPACING.LG},
  cardTitle: {fontSize: 15, fontWeight: '700', color: COLORS.TEXT_PRIMARY, marginBottom: SPACING.MD},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BG_BORDER,
  },
  infoLabel: {fontSize: 13, color: COLORS.TEXT_MUTED, fontWeight: '600'},
  infoValue: {fontSize: 13, color: COLORS.TEXT_PRIMARY, flex: 1, textAlign: 'right'},

  row: {flexDirection: 'row', gap: SPACING.SM},
  halfInput: {flex: 1},
  editActions: {flexDirection: 'row', gap: SPACING.SM, marginTop: SPACING.SM},
  flex: {flex: 1},

  logoutBtn: {marginTop: SPACING.SM},
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SM + 2,
  },
  navRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  navRowArrow: {
    fontSize: 20,
    color: COLORS.TEXT_MUTED,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.BG_BORDER,
    marginVertical: 2,
  },
});


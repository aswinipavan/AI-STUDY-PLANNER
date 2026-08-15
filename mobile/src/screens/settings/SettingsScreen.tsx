import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ScreenHeader} from '@/components/common/ScreenHeader';
import {Card} from '@/components/common/Card';
import {Button} from '@/components/common/Button';
import {COLORS} from '@/constants/colors';
import {SPACING, RADIUS} from '@/constants/theme';
import {useAuthStore} from '@/stores/authStore';
import {useProfile} from '@/hooks/useStudent';
import {updateNotificationPreferences} from '@/api/student.api';
import {CONFIG} from '@/constants/config';
import {getErrorMessage} from '@/utils/errorHandler';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const {student, logout, updateStudent} = useAuthStore();
  const {data: profile} = useProfile();

  const currentStudent = profile || student;

  const [pushEnabled, setPushEnabled] = useState(
    currentStudent?.pushNotifications ?? true,
  );
  const [emailEnabled, setEmailEnabled] = useState(
    currentStudent?.emailNotifications ?? true,
  );
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (currentStudent) {
      setPushEnabled(currentStudent.pushNotifications ?? true);
      setEmailEnabled(currentStudent.emailNotifications ?? true);
    }
  }, [currentStudent]);

  const handleTogglePush = async (value: boolean) => {
    setPushEnabled(value);
    try {
      setIsUpdating(true);
      const updated = await updateNotificationPreferences({
        pushNotifications: value,
        emailNotifications: emailEnabled,
      });
      updateStudent(updated);
    } catch (err) {
      setPushEnabled(!value);
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleEmail = async (value: boolean) => {
    setEmailEnabled(value);
    try {
      setIsUpdating(true);
      const updated = await updateNotificationPreferences({
        pushNotifications: pushEnabled,
        emailNotifications: value,
      });
      updateStudent(updated);
    } catch (err) {
      setEmailEnabled(!value);
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your account?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account Info */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Account</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {currentStudent?.email || '—'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Plan</Text>
            <Text
              style={[
                styles.rowValue,
                currentStudent?.isPremium && styles.premiumText,
              ]}>
              {currentStudent?.isPremium ? '⭐ Premium' : 'Free Tier'}
            </Text>
          </View>
        </Card>

        {/* Notifications */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Notification Preferences</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Study Reminders</Text>
              <Text style={styles.switchDesc}>
                Get daily notifications for upcoming study slots
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              disabled={isUpdating}
              trackColor={{false: COLORS.BG_BORDER, true: COLORS.PRIMARY}}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Email Digests</Text>
              <Text style={styles.switchDesc}>
                Receive weekly timetable and performance summaries
              </Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={handleToggleEmail}
              disabled={isUpdating}
              trackColor={{false: COLORS.BG_BORDER, true: COLORS.PRIMARY}}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Quick Links */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Manage</Text>
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

        {/* System & Version */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>System</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>App Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Backend Status</Text>
            <Text style={[styles.rowValue, styles.connectedText]}>
              ● Connected
            </Text>
          </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DEEP,
  },
  content: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XXL,
  },
  sectionCard: {
    marginBottom: SPACING.MD,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.SM,
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  premiumText: {
    color: COLORS.WARNING,
  },
  connectedText: {
    color: COLORS.SECONDARY,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  switchInfo: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  switchDesc: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.BG_BORDER,
    marginVertical: 4,
  },
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
  logoutBtn: {
    marginTop: SPACING.MD,
  },
});

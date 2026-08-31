'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { useSoundPreference } from '@/hooks/useSoundPreference';
import { useDialog } from '@/hooks/useDialog';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth.api';
import { QK } from '@/constants/queryKeys';
import { Moon, Sun, Monitor, Volume2, User, Bell, LogOut, BookOpen, Building2, Phone, GraduationCap, Camera, Shield, Clock, AlertTriangle, Key, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './settings.module.css';
import { useOnboarding } from '@/hooks/useOnboarding';
import AvatarImage from '@/components/common/AvatarImage';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  calcStudyPeriod,
  ENUM_TO_LABEL,
  LABEL_TO_ENUM,
} from '@/utils/studyPeriodUtils';

const SEMESTER_OPTIONS = [
  { value: '1', label: '1st Year (Semester 1)' },
  { value: '2', label: '1st Year (Semester 2)' },
  { value: '3', label: '2nd Year (Semester 3)' },
  { value: '4', label: '2nd Year (Semester 4)' },
  { value: '5', label: '3rd Year (Semester 5)' },
  { value: '6', label: '3rd Year (Semester 6)' },
  { value: '7', label: '4th Year (Semester 7)' },
  { value: '8', label: '4th Year (Semester 8)' },
  { value: '9', label: '5th Year / Other' },
];
const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics', 'Electrical',
  'Mechanical', 'Civil', 'Chemical', 'Biomedical', 'Mathematics', 'Physics',
  'Commerce', 'Arts', 'Other'
];

const STUDY_DURATIONS = ['1 hour / day', '2 hours / day', '3 hours / day', '4+ hours / day'];

// Start-time-only labels — these replace the old misleading broad-range labels
// ("Evening (5 PM - 9 PM)") with just the preferred start time ("5:00 PM").
// The actual end time is derived live from: start + daily duration = end.
// ENUM_TO_LABEL and LABEL_TO_ENUM are sourced from studyPeriodUtils so there is
// ONE canonical place in the codebase that maps enums ↔ times.
const STUDY_TIMES = Object.values(ENUM_TO_LABEL); // ['6:00 AM', '12:00 PM', '5:00 PM', '9:00 PM']

const DURATION_TO_HOURS: Record<string, number> = {
  '1 hour / day': 1,
  '2 hours / day': 2,
  '3 hours / day': 3,
  '4+ hours / day': 4,
};
const hoursToDurationLabel = (h?: number): string => {
  if (h == null) return '2 hours / day';
  if (h < 1.5) return '1 hour / day';
  if (h < 2.5) return '2 hours / day';
  if (h < 3.5) return '3 hours / day';
  return '4+ hours / day';
};

/**
 * "System" is a real, distinct choice, not the absence of one — the old two-state
 * button could not express it, so following the OS was unreachable once anyone
 * had clicked the toggle even by accident.
 */
const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun; id: string }> = [
  { value: 'light', label: 'Light', icon: Sun, id: 'settings-theme-light' },
  { value: 'dark', label: 'Dark', icon: Moon, id: 'settings-theme-dark' },
  { value: 'system', label: 'System', icon: Monitor, id: 'settings-theme-system' },
];

const THEME_DESCRIPTION: Record<Theme, string> = {
  light: 'Always light, whatever this device is set to',
  dark: 'Always dark, whatever this device is set to',
  system: 'Follows your device appearance setting',
};

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  collegeName: z.string().max(200).optional(),
  semester: z.string().optional(),
  department: z.string().optional(),
  phoneNumber: z.string().max(20).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { soundEnabled, setSoundEnabled } = useSoundPreference();
  const { user, setUser, clearAuth } = useAuthStore();
  const router = useRouter();
  const { replayOnboarding } = useOnboarding();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: fetchedProfile } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: () => authApi.getMe(),
    staleTime: 1000 * 30,
  });

  const activeUser = fetchedProfile || user;

  const departmentOptions = activeUser?.department && !DEPARTMENTS.includes(activeUser.department)
    ? [activeUser.department, ...DEPARTMENTS]
    : DEPARTMENTS;

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Security / Password reset state
  const [pwdResetLoading, setPwdResetLoading] = useState(false);
  const [pwdResetMsg, setPwdResetMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Student study preferences state
  // studyTime holds the canonical START-TIME label (e.g. "5:00 PM"), not a broad-range label.
  // Together with studyDuration it defines: actual end = start + duration.
  const [studyDuration, setStudyDuration] = useState('2 hours / day');
  const [studyTime, setStudyTime] = useState('5:00 PM');
  const [prefSaved, setPrefSaved] = useState(false);

  // Danger Zone state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleReplayOnboarding = () => {
    replayOnboarding();
    router.push('/');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED.includes(file.type)) {
      setAvatarError('Only JPG, PNG, WEBP, or GIF images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be under 5MB.');
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);
    setAvatarProgress(30);

    try {
      // Single multipart request: backend stores the image and returns the updated profile with the
      // new (cache-busted) avatar URL. Replaces the old signed-URL + direct-PUT flow (HTTP 400 local).
      const updatedProfile = await authApi.uploadAvatar(file);
      setAvatarProgress(100);
      setUser(updatedProfile);
      queryClient.setQueryData(['studentProfile'], updatedProfile);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setAvatarError(message);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setAvatarProgress(0), 1200);
    }
  };

  // Notification preferences
  const [emailNotifs, setEmailNotifs] = useState<boolean>(activeUser?.emailNotifications ?? true);
  const [pushNotifs, setPushNotifs] = useState<boolean>(activeUser?.pushNotifications ?? false);
  const [examReminders, setExamReminders] = useState<boolean>(true);
  const [nlpAlerts, setNlpAlerts] = useState<boolean>(true);
  const [notifSaved, setNotifSaved] = useState(false);

  useEffect(() => {
    if (activeUser) {
      setEmailNotifs(activeUser.emailNotifications ?? true);
      setPushNotifs(activeUser.pushNotifications ?? false);
    }
  }, [activeUser]);

  // Load saved study preferences so the dropdowns reflect what the timetable generator will actually use.
  // studyTime is now the start-time label ("5:00 PM") not the old broad-range ("Evening (5 PM - 9 PM)").
  useEffect(() => {
    if (activeUser) {
      setStudyTime(ENUM_TO_LABEL[activeUser.preferredStudyTime ?? ''] ?? '5:00 PM');
      setStudyDuration(hoursToDurationLabel(activeUser.availableHoursPerDay));
    }
  }, [activeUser]);

  const initializedRef = useRef(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: activeUser?.fullName || activeUser?.name || '',
      collegeName: activeUser?.collegeName || '',
      semester: activeUser?.semester != null ? String(activeUser.semester) : '',
      department: activeUser?.department || '',
      phoneNumber: activeUser?.phoneNumber || '',
    },
  });

  useEffect(() => {
    if (fetchedProfile) {
      const isDifferent =
        !user ||
        user.id !== fetchedProfile.id ||
        user.fullName !== fetchedProfile.fullName ||
        user.name !== fetchedProfile.name ||
        user.collegeName !== fetchedProfile.collegeName ||
        user.semester !== fetchedProfile.semester ||
        user.department !== fetchedProfile.department ||
        user.phoneNumber !== fetchedProfile.phoneNumber ||
        user.availableHoursPerDay !== fetchedProfile.availableHoursPerDay ||
        user.preferredStudyTime !== fetchedProfile.preferredStudyTime ||
        user.emailNotifications !== fetchedProfile.emailNotifications ||
        user.pushNotifications !== fetchedProfile.pushNotifications;

      if (isDifferent) {
        setUser(fetchedProfile);
      }
      if (!initializedRef.current || !isDirty) {
        reset({
          name: fetchedProfile.fullName || fetchedProfile.name || '',
          collegeName: fetchedProfile.collegeName || '',
          semester: fetchedProfile.semester != null ? String(fetchedProfile.semester) : '',
          department: fetchedProfile.department || '',
          phoneNumber: fetchedProfile.phoneNumber || '',
        });
        initializedRef.current = true;
      }
    } else if (user && !initializedRef.current) {
      reset({
        name: user.fullName || user.name || '',
        collegeName: user.collegeName || '',
        semester: user.semester != null ? String(user.semester) : '',
        department: user.department || '',
        phoneNumber: user.phoneNumber || '',
      });
      initializedRef.current = true;
    }
  }, [fetchedProfile, user, isDirty, reset, setUser]);

  const { mutate: saveProfile, isPending, isSuccess } = useMutation({
    mutationFn: (data: ProfileFormData) => authApi.updateMe({
      name: data.name.trim(),
      collegeName: data.collegeName?.trim() ?? '',
      semester: data.semester ? parseInt(data.semester, 10) : undefined,
      department: data.department?.trim() ?? '',
      phoneNumber: data.phoneNumber?.trim() ?? '',
    }),
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(['studentProfile'], updated);
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
      reset({
        name: updated.fullName || updated.name || '',
        collegeName: updated.collegeName || '',
        semester: updated.semester != null ? String(updated.semester) : '',
        department: updated.department || '',
        phoneNumber: updated.phoneNumber || '',
      });
    },
  });

  const { mutate: saveNotifications, isPending: isNotifPending } = useMutation({
    mutationFn: authApi.updateNotifications,
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(['studentProfile'], updated);
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
    },
  });

  const handleSaveNotifications = () => {
    saveNotifications({ emailNotifications: emailNotifs, pushNotifications: pushNotifs });
  };

  // Persist study preferences to the backend. These drive automated timetable generation:
  // preferredStudyTime = WHEN sessions are scheduled (StudyTimeWindow enum name, e.g. "EVENING")
  // availableHoursPerDay = daily study budget.
  // Together they define the ACTUAL study period: start time + duration → end time.
  const { mutate: savePreferences, isPending: isPrefPending } = useMutation({
    mutationFn: () => authApi.updateMe({
      preferredStudyTime: LABEL_TO_ENUM[studyTime] ?? 'EVENING',
      availableHoursPerDay: DURATION_TO_HOURS[studyDuration] ?? 2,
    }),
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(['studentProfile'], updated);
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
      queryClient.invalidateQueries({ queryKey: QK.timetable });
      queryClient.invalidateQueries({ queryKey: QK.timetableInsights });
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 3000);
    },
  });

  const handleSavePreferences = () => {
    savePreferences();
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setPwdResetLoading(true);
    setPwdResetMsg(null);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPwdResetMsg({ text: `Password reset link sent to ${user.email}. Check your inbox!` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email.';
      setPwdResetMsg({ text: msg, error: true });
    } finally {
      setPwdResetLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await authApi.deleteAccount();
      await fetch('/api/auth/logout', { method: 'POST' });
      clearAuth();
      router.push('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account.';
      setDeleteError(msg);
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuth();
    router.push('/login');
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="Settings"
        subtitle="Manage your student account, security, and study preferences."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      <div className={styles.cardList}>
        {/* ── A. ACCOUNT PROFILE ── */}
        <div className={`${styles.card} ${styles.cardDelay0}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrap} ${styles.iconPrimary}`}>
              <User size={20} />
            </div>
            <div>
              <h3 className={styles.cardTitle}>Student Profile</h3>
              <p className={styles.cardSubtitle}>{activeUser?.email}</p>
            </div>
          </div>

          {isSuccess && (
            <div className={styles.successMsg}>
              ✓ Profile saved successfully!
            </div>
          )}

          {/* Avatar Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
            aria-label="Upload profile picture"
          />
          <div className={styles.avatarSection}>
            <div
              className={styles.avatarWrapper}
              onClick={handleAvatarClick}
              role="button"
              tabIndex={0}
              aria-label="Change profile picture"
              onKeyDown={(e) => e.key === 'Enter' && handleAvatarClick()}
            >
              {activeUser?.photoUrl || activeUser?.profilePictureUrl ? (
                <AvatarImage
                  src={(activeUser.photoUrl || activeUser.profilePictureUrl)!}
                  alt="Profile"
                  width={72}
                  height={72}
                  className={styles.avatarImg}
                  fallback={
                    <div className={styles.avatarFallback}>
                      {(activeUser?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  }
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {(activeUser?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className={styles.avatarOverlay}>
                {avatarUploading ? (
                  <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>...</span>
                ) : (
                  <Camera size={20} />
                )}
              </div>
            </div>
            <div className={styles.avatarInfo}>
              <p className={styles.avatarInfoTitle}>Profile Photo</p>
              <p className={styles.avatarInfoSubtitle}>
                {avatarUploading ? 'Uploading...' : 'Click avatar to change · JPG, PNG, WEBP · Max 5MB'}
              </p>
              {avatarProgress > 0 && (
                <div className={styles.avatarUploadProgress}>
                  <div className={styles.avatarUploadBar} style={{ width: `${avatarProgress}%` }} />
                </div>
              )}
              {avatarError && <p className={styles.avatarError}>{avatarError}</p>}
            </div>
          </div>

          <form onSubmit={handleSubmit((data) => saveProfile(data))} className="space-y-4">
            <div className={styles.formGroup}>
              <AppInput
                label="Full Name"
                placeholder="Your name"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            {/* College Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <Building2 size={14} className="inline mr-1" />College / University
              </label>
              <AppInput
                placeholder="e.g. Stanford, MIT, National Institute of Technology..."
                error={errors.collegeName?.message}
                {...register('collegeName')}
              />
            </div>

            {/* Semester / Year */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <GraduationCap size={14} className="inline mr-1" />Academic Year / Semester
              </label>
              <select {...register('semester')} className={styles.select} data-testid="settings-semester-select">
                <option value="">Select year / semester...</option>
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Department / Major</label>
              <select {...register('department')} className={styles.select} data-testid="settings-department-select">
                <option value="">Select department...</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <Phone size={14} className="inline mr-1" />Phone Number (optional)
              </label>
              <AppInput
                placeholder="+91 9876543210"
                error={errors.phoneNumber?.message}
                data-testid="settings-phone-input"
                {...register('phoneNumber')}
              />
            </div>

            {user?.isPremium && (
              <div className={styles.premiumBadge}>
                ⭐ Premium Member
              </div>
            )}

            <div className="pt-4">
              <AppButton
                type="submit"
                loading={isPending || isSubmitting}
                disabled={!isDirty}
                className="w-full"
              >
                Save Profile
              </AppButton>
            </div>
          </form>
        </div>

        {/* ── B. SECURITY ── */}
        <div className={`${styles.card} ${styles.cardDelay1}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrap} ${styles.iconPrimary}`}>
              <Shield size={20} />
            </div>
            <div>
              <h3 className={styles.cardTitle}>Security & Access</h3>
              <p className={styles.cardSubtitle}>Manage your login and password</p>
            </div>
          </div>

          {pwdResetMsg && (
            <div className={pwdResetMsg.error ? styles.avatarError : styles.successMsg}>
              {pwdResetMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Account Authentication</h4>
                <p className={styles.toggleDesc}>Connected as <strong>{user?.email}</strong></p>
              </div>
              <span style={{ fontSize: '0.8125rem', background: 'rgba(0, 229, 192, 0.1)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                Active Session
              </span>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Reset Password</h4>
                <p className={styles.toggleDesc}>Send a secure password reset link to your registered email</p>
              </div>
              <AppButton
                variant="outline"
                onClick={handlePasswordReset}
                loading={pwdResetLoading}
                id="btn-settings-reset-pwd"
              >
                <Key size={14} className="mr-1 inline" /> Send Reset Link
              </AppButton>
            </div>
          </div>
        </div>

        {/* ── C. STUDENT STUDY PREFERENCES ── */}
        <div className={`${styles.card} ${styles.cardDelay2}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrap} ${styles.iconWarning}`}>
              <Clock size={20} />
            </div>
            <div>
              <h3 className={styles.cardTitle}>Study Planner Preferences</h3>
              <p className={styles.cardSubtitle}>Tailor automated timetable generation to your schedule</p>
            </div>
          </div>

          {prefSaved && (
            <div className={styles.successMsg}>
              ✓ Study preferences saved!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Daily Target Study Duration</label>
              <select
                value={studyDuration}
                onChange={(e) => setStudyDuration(e.target.value)}
                className={styles.select}
                data-testid="study-duration-select"
              >
                {STUDY_DURATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Preferred Start Time</label>
              <select
                value={studyTime}
                onChange={(e) => setStudyTime(e.target.value)}
                className={styles.select}
                data-testid="study-time-select"
              >
                {STUDY_TIMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* ── Live study period preview ── */}
            {(() => {
              const windowEnum = LABEL_TO_ENUM[studyTime] ?? 'EVENING';
              const hours = DURATION_TO_HOURS[studyDuration] ?? 2;
              const period = calcStudyPeriod(windowEnum, hours);
              return (
                <div className={styles.studyPeriodPreview} data-testid="study-period-preview">
                  <div className={styles.studyPeriodPreviewIcon}>
                    <Clock size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <span className={styles.studyPeriodPreviewLabel}>
                      Actual daily study period:
                    </span>
                    {' '}
                    <strong
                      className={styles.studyPeriodPreviewValue}
                      data-testid="study-period-value"
                    >
                      {period.label}
                    </strong>
                    {period.crossesMidnight && (
                      <p className={styles.studyPeriodMidnightWarning}>
                        ⚠ This window extends past midnight. Consider choosing an earlier start time or a shorter duration.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="pt-2">
              <AppButton
                variant="outline"
                onClick={handleSavePreferences}
                loading={isPrefPending}
                className="w-full"
              >
                Save Study Preferences
              </AppButton>
            </div>
          </div>
        </div>

        {/* ── D. NOTIFICATIONS ── */}
        <div className={`${styles.card} ${styles.cardDelay2}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrap} ${styles.iconNotification}`}>
              <Bell size={20} />
            </div>
            <div>
              <h3 className={styles.cardTitle}>Academic Notifications</h3>
              <p className={styles.cardSubtitle}>Configure reminders and intelligence updates</p>
            </div>
          </div>

          {notifSaved && (
            <div className={styles.successMsg}>
              ✓ Notification preferences saved!
            </div>
          )}

          <div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Upcoming Exam Reminders</h4>
                <p className={styles.toggleDesc}>Alerts 24h & 48h before scheduled exams</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={examReminders}
                  onChange={(e) => setExamReminders(e.target.checked)}
                  aria-label="Toggle exam reminders"
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>AI Material Processing Alerts</h4>
                <p className={styles.toggleDesc}>Notify when PDF chapters and topics finish extracting</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={nlpAlerts}
                  onChange={(e) => setNlpAlerts(e.target.checked)}
                  aria-label="Toggle NLP processing alerts"
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Weekly Study Summary Emails</h4>
                <p className={styles.toggleDesc}>Receive weekly study progress report</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  aria-label="Toggle email notifications"
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Push Notifications</h4>
                <p className={styles.toggleDesc}>Timetable slot notifications on your device</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={pushNotifs}
                  onChange={(e) => setPushNotifs(e.target.checked)}
                  aria-label="Toggle push notifications"
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className="pt-4">
              <AppButton
                variant="outline"
                onClick={handleSaveNotifications}
                loading={isNotifPending}
                className="w-full"
              >
                Save Notification Preferences
              </AppButton>
            </div>
          </div>
        </div>

        {/* ── E. APPEARANCE & FEEDBACK ── */}
        <div className={`${styles.card} ${styles.cardDelay1}`}>
          <div className={styles.cardHeader}>
            {/* Which glyph shows is decided by CSS from the `.dark` class the
                pre-paint script sets. The card used to call isDark() during
                render, which reads the DOM mid-render and never re-ran when the
                OS flipped, so the icon and the button label went stale. */}
            <div className={`${styles.iconWrap} ${styles.iconWarning}`}>
              <Sun size={20} className="dark:hidden" aria-hidden="true" />
              <Moon size={20} className="hidden dark:block" aria-hidden="true" />
            </div>
            <div>
              <h3 className={styles.cardTitle}>Appearance & Feedback</h3>
              <p className={styles.cardSubtitle}>Theme and interface sound, saved on this device</p>
            </div>
          </div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <h4 className={styles.toggleTitle}>Theme</h4>
              <p className={styles.toggleDesc}>{THEME_DESCRIPTION[theme]}</p>
            </div>
            <div className={styles.segmented} role="group" aria-label="Theme">
              {THEME_OPTIONS.map(({ value, label, icon: Icon, id }) => (
                <label
                  key={value}
                  htmlFor={id}
                  className={`${styles.segment} ${theme === value ? styles.segmentActive : ''}`}
                >
                  <input
                    id={id}
                    type="radio"
                    name="theme"
                    value={value}
                    checked={theme === value}
                    onChange={() => setTheme(value)}
                  />
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <h4 className={styles.toggleTitle}>
                <Volume2 size={14} className="mr-1 inline" aria-hidden="true" />
                Sound Feedback
              </h4>
              <p className={styles.toggleDesc}>
                A short cue when a study session completes, a badge unlocks, or an upload
                finishes. Nothing plays in a background tab, and never continuously.
              </p>
            </div>
            <label className={styles.switch}>
              <input
                id="settings-sound-toggle"
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                aria-label="Toggle sound feedback"
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>

        {/* ── ONBOARDING & LOGOUT ── */}
        <div className={`${styles.card} ${styles.cardDelay3}`}>
          <div className={styles.cardRow}>
            <div className={`${styles.cardHeader} ${styles.cardHeaderFlush}`}>
              <div className={`${styles.iconWrap} ${styles.iconPrimary}`}>
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>Onboarding Tour</h3>
                <p className={styles.cardSubtitle}>Replay the welcome tour</p>
              </div>
            </div>
            <AppButton variant="outline" onClick={handleReplayOnboarding} id="settings-replay-onboarding">
              Replay Tour
            </AppButton>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardDelay3}`}>
          <div className={styles.cardRow}>
            <div className={`${styles.cardHeader} ${styles.cardHeaderFlush}`}>
              <div className={`${styles.iconWrap} ${styles.iconPrimary}`}>
                <LogOut size={20} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>Sign Out</h3>
                <p className={styles.cardSubtitle}>Safely log out of your session</p>
              </div>
            </div>
            <AppButton variant="outline" onClick={handleLogout} id="settings-logout">
              Log Out
            </AppButton>
          </div>
        </div>

        {/* ── F. DANGER ZONE ── */}
        <div className={`${styles.card} ${styles.cardDelay3}`} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.02)' }}>
          <div className={styles.cardRow}>
            <div className={`${styles.cardHeader} ${styles.cardHeaderFlush}`}>
              <div className={`${styles.iconWrap} ${styles.iconDanger}`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className={styles.cardTitle} style={{ color: '#ef4444' }}>Danger Zone</h3>
                <p className={styles.cardSubtitle}>Permanently delete your account and study data</p>
              </div>
            </div>
            <AppButton variant="danger" onClick={() => setShowDeleteModal(true)} id="btn-open-delete-account">
              Delete Account
            </AppButton>
          </div>
        </div>

      </div>

      {/* Delete Account Modal */}
      <DeleteAccountDialog
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(null); }}
        confirmText={deleteConfirmText}
        onConfirmTextChange={setDeleteConfirmText}
        error={deleteError}
        loading={deleteLoading}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  confirmText: string;
  onConfirmTextChange: (value: string) => void;
  error: string | null;
  loading: boolean;
  onConfirm: () => void;
}

/**
 * Its own component so {@link useDialog} can be called unconditionally — the
 * modal used to be inline JSX behind `showDeleteModal &&`, which meant no
 * Escape, no focus trap, no scroll lock, and a `z-index: 9999` that put it above
 * even the onboarding takeover. It now behaves like every other dialog.
 */
function DeleteAccountDialog({
  isOpen, onClose, confirmText, onConfirmTextChange, error, loading, onConfirm,
}: DeleteAccountDialogProps) {
  const panelRef = useDialog(isOpen, onClose);
  const titleId = useId();
  // A fixed id, not useId(): there is only ever one of these dialogs, and the
  // e2e suite selects the field by it.
  const confirmId = 'input-delete-confirm';

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.modalPanel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalTitleRow}>
          <AlertTriangle size={24} aria-hidden="true" />
          <h3 id={titleId} className={styles.modalTitle}>Delete Student Account</h3>
        </div>

        <p className={styles.modalText}>
          This action is <strong>irreversible</strong>. Permanently deleting your account will erase:
        </p>
        <ul className={styles.modalList}>
          <li>All uploaded academic study materials &amp; NLP extracted intelligence</li>
          <li>Generated timetables, slots, and study progress</li>
          <li>All subjects, marks, exams, and performance analytics</li>
          <li>Complete AI chat conversation history</li>
        </ul>

        {error && (
          <div className={styles.avatarError} role="alert" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor={confirmId} className={styles.modalConfirmLabel}>
            Type <strong>DELETE</strong> to confirm:
          </label>
          <input
            id={confirmId}
            type="text"
            value={confirmText}
            onChange={(e) => onConfirmTextChange(e.target.value)}
            placeholder="DELETE"
            className={`${styles.input} ${styles.modalDanger}`}
          />
        </div>

        <div className={styles.modalActions}>
          <AppButton variant="outline" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            variant="danger"
            id="btn-confirm-delete-account"
            loading={loading}
            disabled={confirmText.trim().toUpperCase() !== 'DELETE'}
            onClick={onConfirm}
          >
            <Trash2 size={16} className="mr-1 inline" aria-hidden="true" /> Delete Permanently
          </AppButton>
        </div>
      </div>
    </div>
  );
}

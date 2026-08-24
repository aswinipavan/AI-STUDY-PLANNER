'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth.api';
import { Moon, Sun, User, Bell, LogOut, BookOpen, Building2, Phone, GraduationCap, Camera, Shield, Clock, AlertTriangle, Key, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './settings.module.css';
import { useOnboarding } from '@/hooks/useOnboarding';
import AvatarImage from '@/components/common/AvatarImage';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const SEMESTERS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Other'];
const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics', 'Electrical',
  'Mechanical', 'Civil', 'Chemical', 'Biomedical', 'Mathematics', 'Physics',
  'Commerce', 'Arts', 'Other'
];

const STUDY_DURATIONS = ['1 hour / day', '2 hours / day', '3 hours / day', '4+ hours / day'];
const STUDY_TIMES = ['Morning (6 AM - 12 PM)', 'Afternoon (12 PM - 5 PM)', 'Evening (5 PM - 9 PM)', 'Late Night (9 PM - 12 AM)'];

// The backend timetable generator reads these as the source of truth for WHEN to schedule study
// sessions, so the settings labels must map cleanly to the StudyTimeWindow enum and an hours number.
const STUDY_TIME_TO_ENUM: Record<string, string> = {
  'Morning (6 AM - 12 PM)': 'MORNING',
  'Afternoon (12 PM - 5 PM)': 'AFTERNOON',
  'Evening (5 PM - 9 PM)': 'EVENING',
  'Late Night (9 PM - 12 AM)': 'LATE_NIGHT',
};
const ENUM_TO_STUDY_TIME: Record<string, string> = {
  MORNING: 'Morning (6 AM - 12 PM)',
  AFTERNOON: 'Afternoon (12 PM - 5 PM)',
  EVENING: 'Evening (5 PM - 9 PM)',
  LATE_NIGHT: 'Late Night (9 PM - 12 AM)',
};
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

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  collegeName: z.string().max(200).optional(),
  semester: z.string().optional(),
  department: z.string().optional(),
  phoneNumber: z.string().max(20).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { toggleTheme, isDark } = useTheme();
  const { user, setUser, clearAuth } = useAuthStore();
  const router = useRouter();
  const { replayOnboarding } = useOnboarding();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Security / Password reset state
  const [pwdResetLoading, setPwdResetLoading] = useState(false);
  const [pwdResetMsg, setPwdResetMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Student study preferences state
  const [studyDuration, setStudyDuration] = useState('2 hours / day');
  const [studyTime, setStudyTime] = useState('Evening (5 PM - 9 PM)');
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
  const [emailNotifs, setEmailNotifs] = useState<boolean>(user?.emailNotifications ?? true);
  const [pushNotifs, setPushNotifs] = useState<boolean>(user?.pushNotifications ?? false);
  const [examReminders, setExamReminders] = useState<boolean>(true);
  const [nlpAlerts, setNlpAlerts] = useState<boolean>(true);
  const [notifSaved, setNotifSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setEmailNotifs(user.emailNotifications ?? true);
      setPushNotifs(user.pushNotifications ?? false);
    }
  }, [user]);

  // Load saved study preferences so the dropdowns reflect what the timetable generator will actually use.
  useEffect(() => {
    if (user) {
      setStudyTime(ENUM_TO_STUDY_TIME[user.preferredStudyTime ?? ''] ?? 'Evening (5 PM - 9 PM)');
      setStudyDuration(hoursToDurationLabel(user.availableHoursPerDay));
    }
  }, [user]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || user?.fullName || '',
      collegeName: user?.collegeName || '',
      semester: user?.semester ? `${user.semester}` : '',
      department: user?.department || '',
      phoneNumber: user?.phoneNumber || '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || user.fullName || '',
        collegeName: user.collegeName || '',
        semester: user.semester ? String(user.semester) : '',
        department: user.department || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user, reset]);

  const { mutate: saveProfile, isPending, isSuccess } = useMutation({
    mutationFn: (data: ProfileFormData) => authApi.updateMe({
      name: data.name,
      collegeName: data.collegeName,
      semester: data.semester ? Number(data.semester) : undefined,
      department: data.department,
    }),
    onSuccess: (updated) => {
      setUser(updated);
      reset({
        name: updated.name || updated.fullName || '',
        collegeName: updated.collegeName || '',
        semester: updated.semester ? String(updated.semester) : '',
        department: updated.department || '',
        phoneNumber: updated.phoneNumber || '',
      });
    },
  });

  const { mutate: saveNotifications, isPending: isNotifPending } = useMutation({
    mutationFn: authApi.updateNotifications,
    onSuccess: (updated) => {
      setUser(updated);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
    },
  });

  const handleSaveNotifications = () => {
    saveNotifications({ emailNotifications: emailNotifs, pushNotifications: pushNotifs });
  };

  // Persist study preferences to the backend. These drive automated timetable generation:
  // preferredStudyTime = WHEN sessions are scheduled (StudyTimeWindow), availableHoursPerDay = daily budget.
  const { mutate: savePreferences, isPending: isPrefPending } = useMutation({
    mutationFn: () => authApi.updateMe({
      preferredStudyTime: STUDY_TIME_TO_ENUM[studyTime] ?? 'EVENING',
      availableHoursPerDay: DURATION_TO_HOURS[studyDuration] ?? 2,
    }),
    onSuccess: (updated) => {
      setUser(updated);
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
              <p className={styles.cardSubtitle}>{user?.email}</p>
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
              {user?.photoUrl || user?.profilePictureUrl ? (
                <AvatarImage
                  src={(user.photoUrl || user.profilePictureUrl)!}
                  alt="Profile"
                  width={72}
                  height={72}
                  className={styles.avatarImg}
                  fallback={
                    <div className={styles.avatarFallback}>
                      {(user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  }
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
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
              <select {...register('semester')} className={styles.select}>
                <option value="">Select year...</option>
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Department / Major</label>
              <select {...register('department')} className={styles.select}>
                <option value="">Select department...</option>
                {DEPARTMENTS.map((d) => (
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
              >
                {STUDY_DURATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Preferred Study Time of Day</label>
              <select
                value={studyTime}
                onChange={(e) => setStudyTime(e.target.value)}
                className={styles.select}
              >
                {STUDY_TIMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

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

        {/* ── E. APPEARANCE ── */}
        <div className={`${styles.card} ${styles.cardDelay1}`}>
          <div className={styles.cardRow}>
            <div className={`${styles.cardHeader} ${styles.cardHeaderFlush}`}>
              <div className={`${styles.iconWrap} ${styles.iconWarning}`}>
                {isDark() ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                <h3 className={styles.cardTitle}>Appearance</h3>
                <p className={styles.cardSubtitle}>Toggle dark / light theme</p>
              </div>
            </div>
            <AppButton variant="outline" onClick={toggleTheme} id="settings-theme-toggle">
              {isDark() ? 'Switch to Light' : 'Switch to Dark'}
            </AppButton>
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
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--color-card, #1a1a24)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#ef4444' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Delete Student Account</h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
              This action is <strong>irreversible</strong>. Permanently deleting your account will erase:
            </p>
            <ul style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '1.5rem', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
              <li>All uploaded academic study materials & NLP extracted intelligence</li>
              <li>Generated timetables, slots, and study progress</li>
              <li>All subjects, marks, exams, and performance analytics</li>
              <li>Complete AI chat conversation history</li>
            </ul>

            {deleteError && (
              <div className={styles.avatarError} style={{ marginBottom: '1rem' }}>
                {deleteError}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                id="input-delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className={styles.input}
                style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <AppButton
                variant="outline"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(null); }}
              >
                Cancel
              </AppButton>
              <AppButton
                variant="danger"
                id="btn-confirm-delete-account"
                loading={deleteLoading}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleDeleteAccount}
              >
                <Trash2 size={16} className="mr-1 inline" /> Delete Permanently
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

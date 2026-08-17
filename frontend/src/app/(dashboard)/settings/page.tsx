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
import { Moon, Sun, User, Bell, LogOut, BookOpen, Building2, Phone, GraduationCap, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './settings.module.css';
import { useOnboarding } from '@/hooks/useOnboarding';
import Image from 'next/image';


const SEMESTERS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Other'];
const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics', 'Electrical',
  'Mechanical', 'Civil', 'Chemical', 'Biomedical', 'Mathematics', 'Physics',
  'Commerce', 'Arts', 'Other'
];

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
    setAvatarProgress(20);

    try {
      // 1. Get pre-signed upload URL from backend
      const uploadInfo = await authApi.getAvatarUploadUrl(file.name, file.type);
      setAvatarProgress(40);

      // 2. Upload directly to Supabase Storage
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (uploadInfo.anonKey) {
        headers['Authorization'] = `Bearer ${uploadInfo.anonKey}`;
        headers['apikey'] = uploadInfo.anonKey;
      }

      const res = await fetch(uploadInfo.uploadUrl, {
        method: 'PUT',
        body: file,
        headers,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Upload failed (${res.status}): ${errText}`);
      }
      setAvatarProgress(75);

      // 3. Update profile with new avatar URL
      const updatedProfile = await authApi.updateMe({ profilePictureUrl: uploadInfo.fileUrl });
      setUser(updatedProfile);
      setAvatarProgress(100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setAvatarError(message);
    } finally {
      setAvatarUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setAvatarProgress(0), 1200);
    }
  };

  // Notification preferences
  const [emailNotifs, setEmailNotifs] = useState<boolean>(user?.emailNotifications ?? true);
  const [pushNotifs, setPushNotifs] = useState<boolean>(user?.pushNotifications ?? false);
  const [notifSaved, setNotifSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setEmailNotifs(user.emailNotifications ?? true);
      setPushNotifs(user.pushNotifications ?? false);
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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuth();
    router.push('/login');
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="Settings"
        subtitle="Manage your account and preferences."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      <div className={styles.cardList}>
        {/* Profile Edit */}
        <div className={`${styles.card} ${styles.cardDelay0}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrap} ${styles.iconPrimary}`}>
              <User size={20} />
            </div>
            <div>
              <h3 className={styles.cardTitle}>Profile</h3>
              <p className={styles.cardSubtitle}>{user?.email}</p>
            </div>
          </div>

          {isSuccess && (
            <div className={styles.successMsg}>
              ✓ Profile saved successfully!
            </div>
          )}

          {/* ── Avatar Upload ── */}
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
                <Image
                  src={(user.photoUrl || user.profilePictureUrl)!}
                  alt="Profile"
                  width={72}
                  height={72}
                  className={styles.avatarImg}
                  unoptimized
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
                <Building2 size={14} className="inline mr-1" />College / Institution
              </label>
              <AppInput
                placeholder="e.g. MIT, Stanford University..."
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
              <label className={styles.label}>Department / Stream</label>
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

        {/* Appearance */}
        <div className={`${styles.card} ${styles.cardDelay1}`}>
          <div className={styles.cardRow}>
            <div className={`${styles.cardHeader} ${styles.cardHeaderFlush}`}>
              <div className={`${styles.iconWrap} ${styles.iconWarning}`}>
                {isDark() ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                <h3 className={styles.cardTitle}>Appearance</h3>
                <p className={styles.cardSubtitle}>Toggle light / dark theme</p>
              </div>
            </div>
            <AppButton variant="outline" onClick={toggleTheme} id="settings-theme-toggle">
              {isDark() ? 'Switch to Light' : 'Switch to Dark'}
            </AppButton>
          </div>
        </div>

        {/* Notifications */}
        <div className={`${styles.card} ${styles.cardDelay2}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.iconWrap} ${styles.iconNotification}`}>
              <Bell size={20} />
            </div>
            <div>
              <h3 className={styles.cardTitle}>Notifications</h3>
              <p className={styles.cardSubtitle}>Manage how we contact you</p>
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
                <h4 className={styles.toggleTitle}>Email Notifications</h4>
                <p className={styles.toggleDesc}>Receive weekly study summaries</p>
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
                <p className={styles.toggleDesc}>Get exam reminders on your device</p>
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

        {/* Replay Onboarding */}
        <div className={`${styles.card} ${styles.cardDelay3}`}>
          <div className={styles.cardRow}>
            <div className={`${styles.cardHeader} ${styles.cardHeaderFlush}`}>
              <div className={`${styles.iconWrap} ${styles.iconPrimary}`}>
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>Onboarding Tour</h3>
                <p className={styles.cardSubtitle}>Replay the welcome experience</p>
              </div>
            </div>
            <AppButton variant="outline" onClick={handleReplayOnboarding} id="settings-replay-onboarding">
              Replay Tour
            </AppButton>
          </div>
        </div>

        {/* Logout */}
        <div className={`${styles.card} ${styles.cardDelay3}`}>
          <div className={styles.cardRow}>
            <div className={`${styles.cardHeader} ${styles.cardHeaderFlush}`}>
              <div className={`${styles.iconWrap} ${styles.iconDanger}`}>
                <LogOut size={20} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>Account</h3>
                <p className={styles.cardSubtitle}>Sign out of your account</p>
              </div>
            </div>
            <AppButton variant="danger" onClick={handleLogout} id="settings-logout">
              Log Out
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}

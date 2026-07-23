'use client';

import React, { useEffect, useState } from 'react';
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
import { Moon, Sun, User, Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './settings.module.css';

const GRADES = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Undergraduate', 'Postgraduate', 'Other'];

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  grade: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { toggleTheme, isDark } = useTheme();
  const { user, setUser, clearAuth } = useAuthStore();
  const router = useRouter();

  // Mock settings for BUG-007
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', grade: user?.grade ?? '' },
  });

  useEffect(() => {
    if (user) reset({ name: user.name, grade: user.grade ?? '' });
  }, [user, reset]);

  const { mutate: saveProfile, isPending, isSuccess } = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updated) => {
      setUser(updated);
      reset({ name: updated.name, grade: updated.grade ?? '' });
    },
  });

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

          <form onSubmit={handleSubmit((data) => saveProfile(data))} className="space-y-4">
            <div className={styles.formGroup}>
              <AppInput
                label="Full Name"
                placeholder="Your name"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Grade / Year</label>
              <select
                {...register('grade')}
                className={styles.select}
              >
                <option value="">Select grade...</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
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
            <AppButton variant="outline" onClick={toggleTheme}>
              {isDark() ? 'Switch to Light' : 'Switch to Dark'}
            </AppButton>
          </div>
        </div>

        {/* Notifications (Fix for BUG-007) */}
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
          
          <div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Email Notifications</h4>
                <p className={styles.toggleDesc}>Receive weekly study summaries</p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} aria-label="Toggle email notifications" />
                <span className={styles.slider}></span>
              </label>
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <h4 className={styles.toggleTitle}>Push Notifications</h4>
                <p className={styles.toggleDesc}>Get exam reminders on your device</p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={pushNotifs} onChange={(e) => setPushNotifs(e.target.checked)} aria-label="Toggle push notifications" />
                <span className={styles.slider}></span>
              </label>
            </div>
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
            <AppButton variant="danger" onClick={handleLogout}>
              Log Out
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}

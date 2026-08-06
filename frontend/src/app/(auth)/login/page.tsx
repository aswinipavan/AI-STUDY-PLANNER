'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  AuthErrorCodes,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import styles from './page.module.css';
import { StudentProfile } from '@/types/api.types';


type Tab = 'signin' | 'register';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function friendlyError(err: unknown): string {
  const code = (err as {code?: string})?.code || '';
  const message = (err as {message?: string})?.message || '';
  switch (code) {
    case AuthErrorCodes.EMAIL_EXISTS:         return 'An account with this email already exists.';
    case AuthErrorCodes.INVALID_EMAIL:        return 'Please enter a valid email address.';
    case AuthErrorCodes.WEAK_PASSWORD:        return 'Password must be at least 6 characters.';
    case AuthErrorCodes.USER_DELETED:         return 'No account found with this email.';
    case AuthErrorCodes.INVALID_PASSWORD:     return 'Incorrect password. Please try again.';
    case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER: return 'Too many attempts. Please try again later.';
    case AuthErrorCodes.POPUP_CLOSED_BY_USER: return 'Sign-in window was closed. Please try again.';
    case AuthErrorCodes.POPUP_BLOCKED:        return 'Pop-up was blocked by browser. Please allow pop-ups.';
    case 'auth/invalid-credential':           return 'Invalid email or password.';
    case 'auth/unauthorized-domain':          return 'This domain is not authorised for sign-in. Please contact support.';
    case 'auth/configuration-not-found':      return 'Firebase is not configured correctly. Please contact support.';
    case 'auth/network-request-failed':       return 'Network error. Please check your connection and try again.';
    case 'auth/internal-error':               return 'An internal error occurred. Please try again.';
  }
  if (message === 'backend-unavailable') return 'Server is starting up. Please wait 30 seconds and try again.';
  if (message && !message.startsWith('Firebase')) return message;
  return `Something went wrong (${code || message || 'unknown'}). Please try again.`;
}

export default function LoginPage() {
  const router = useRouter();
  const setUserAction = useAuthStore((s) => s.setUser);

  const [tab, setTab]           = useState<Tab>('signin');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [backendStatus, setBackendStatus] = useState<'warming' | 'awake' | null>(null);

  // Clear errors when switching tabs
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setError(''); setSuccess(''); }, [tab]);

  // Wake up the Render backend on page mount to avoid cold-start delays on login
  useEffect(() => {
    setBackendStatus('warming');
    fetch('/api/wake')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'awake') setBackendStatus('awake');
        else setBackendStatus(null);
      })
      .catch(() => setBackendStatus(null));
  }, []);

  // ── Shared: exchange Firebase token with backend proxy ────────────────────
  async function exchangeToken(idToken: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken: idToken }),
    });
    const data = await res.json();
    // Accept both 200 (backend success) and any response that has a user
    if (!res.ok && !data.user) {
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error('backend-unavailable');
      }
      // Use Firebase code if present, otherwise surface real error
      const firebaseCode = (data as {code?: string}).code;
      if (firebaseCode) throw Object.assign(new Error(firebaseCode), { code: firebaseCode });
      throw new Error(data.error || `Server error (${res.status})`);
    }
    if (data.user) {
      setUserAction({
        id: data.user.id || data.user.uid || '',
        firebaseUid: data.user.uid || '',
        name: data.user.displayName || data.user.name || '',
        email: data.user.email || '',
        photoUrl: data.user.photoURL || data.user.photoUrl || '',
        isPremium: data.user.isPremium ?? false,
        createdAt: data.user.createdAt || new Date().toISOString(),
      } as StudentProfile);
    }
    router.push('/dashboard');
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      await exchangeToken(token);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Email Sign In ─────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      await exchangeToken(token);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Email Register ────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      const token = await result.user.getIdToken(true);
      await exchangeToken(token);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Backend warm-up status — only show while warming */}
      {backendStatus === 'warming' && (
        <div style={{ position: 'fixed', top: 12, right: 16, fontSize: 12, color: '#aaa', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 999, zIndex: 999 }}>
          ⚡ Connecting to server...
        </div>
      )}
      
      {/* Subtle grid */}
      <div aria-hidden className={styles.backgroundGrid} />

      <div className={styles.contentWrapper}>

        {/* Logo + Brand */}
        <div className={styles.header}>
          <div className={styles.logoBox}>
            <span className={styles.logoText}>S</span>
          </div>
          <h1 className={styles.title}>
            AI Study Planner
          </h1>
          <p className={styles.subtitle}>
            {tab === 'signin' ? 'Welcome back! Sign in to continue.' : 'Create your free account today.'}
          </p>
        </div>

        {/* Card */}
        <div className={styles.card}>

          {/* Tabs */}
          <div className={styles.tabs}>
            {(['signin', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                id={`tab-${t}`}
                onClick={() => setTab(t)}
                className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : styles.tabBtnInactive}`}
              >
                {t === 'signin' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Error / Success banners */}
          {error && (
            <div className={styles.errorBanner}>
              {error}
            </div>
          )}
          {success && (
            <div className={styles.successBanner}>
              {success}
            </div>
          )}

          {/* ── SIGN IN FORM ── */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className={styles.form}>
              <div>
                <label className={styles.label}>
                  Email
                </label>
                <input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={styles.input}
                />
              </div>

              <div>
                <div className={styles.pwdHeader}>
                  <label className={styles.pwdLabel}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className={styles.togglePwdBtn}
                  >
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="signin-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={styles.input}
                />
              </div>

              <button
                id="btn-signin-email"
                type="submit"
                disabled={loading}
                className={`${styles.submitBtn} ${loading ? styles.submitBtnLoading : styles.submitBtnActive}`}
              >
                {loading ? (
                  <><div className={styles.spinner} /> Signing in...</>
                ) : 'Sign In →'}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className={styles.form}>
              <div>
                <label className={styles.label}>
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aswin Kumar"
                  autoComplete="name"
                  className={styles.input}
                />
              </div>

              <div>
                <label className={styles.label}>
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={styles.input}
                />
              </div>

              <div>
                <div className={styles.pwdHeader}>
                  <label className={styles.pwdLabel}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className={styles.togglePwdBtn}
                  >
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="reg-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  className={styles.input}
                />
              </div>

              <div>
                <label className={styles.label}>
                  Confirm Password
                </label>
                <input
                  id="reg-confirm"
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className={styles.input}
                />
              </div>

              <button
                id="btn-register"
                type="submit"
                disabled={loading}
                className={`${styles.submitBtn} ${loading ? styles.submitBtnLoading : styles.submitBtnActive}`}
              >
                {loading ? (
                  <><div className={styles.spinner} /> Creating account...</>
                ) : 'Create Account →'}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className={styles.dividerContainer}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>or continue with</span>
            <div className={styles.dividerLine} />
          </div>

          {/* Google Button */}
          <button
            id="btn-google"
            onClick={handleGoogle}
            disabled={loading}
            className={`${styles.googleBtn} ${loading ? styles.googleBtnLoading : styles.googleBtnActive}`}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Footer */}
          <p className={styles.footerText}>
            {tab === 'signin' ? (
              <>Don&apos;t have an account?{' '}
                <button onClick={() => setTab('register')} className={styles.linkBtn}>
                  Register free
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => setTab('signin')} className={styles.linkBtn}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        {/* Back to home */}
        <p className={styles.backHomeText}>
          <Link href="/" className={styles.backHomeLink}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

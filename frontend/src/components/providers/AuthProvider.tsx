'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, onIdTokenChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { setUserProfile } from '@/lib/firestore';
import { useAuthStore } from '@/stores/authStore';
import { StudentProfile } from '@/types/api.types';
import { authApi } from '@/api/auth.api';

interface AuthContextValue {
  firebaseUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  loading: true,
});

export function useFirebaseAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const { setUser, clearAuth } = useAuthStore();

  // ── Sync Firebase ID token to cookie for SSR ────────────────────────────
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        // Sync to cookie so server components can read auth state
        document.cookie = `__session=${token}; path=/; SameSite=Strict`;
      } else {
        document.cookie = '__session=; path=/; max-age=0';
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Main auth state listener ─────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true);
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        // Upsert user profile in Firestore if available (fail-safe)
        try {
          await setUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });
        } catch (firestoreErr) {
          console.warn('[AuthProvider] Firestore sync skipped or failed:', firestoreErr);
        }

        // Try to fetch full profile from backend database to ensure 100% persistence
        let profileLoaded = false;
        try {
          const profile = await authApi.getMe();
          if (profile && profile.id) {
            setUser(profile);
            profileLoaded = true;
          }
        } catch {
          // If getMe fails (e.g. cookie expired or first session), exchange the Firebase token
          try {
            const token = await user.getIdToken();
            const loginRes = await authApi.login(token);
            if (loginRes?.user) {
              setUser(loginRes.user as StudentProfile);
              profileLoaded = true;
            }
          } catch (loginErr) {
            console.warn('[AuthProvider] Backend profile sync failed:', loginErr);
          }
        }

        if (!profileLoaded) {
          // Fallback: If backend is temporarily offline, keep existing persisted user if matching UID
          const current = useAuthStore.getState().user;
          if (!current || (current.firebaseUid !== user.uid && current.id !== user.uid)) {
            setUser({
              id: user.uid,
              name: user.displayName ?? '',
              fullName: user.displayName ?? '',
              email: user.email ?? '',
              photoUrl: user.photoURL ?? '',
              isPremium: false,
              firebaseUid: user.uid,
              createdAt: new Date().toISOString(),
            } as StudentProfile);
          }
        }
      } else {
        try {
          const profile = await authApi.getMe();
          if (profile && (profile.id || profile.email)) {
            setUser(profile);
            setLoading(false);
            return;
          }
        } catch {
          // No active session or unauthenticated
        }
        clearAuth();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, clearAuth]);

  // Prevent layout shift by showing skeleton or placeholder while loading
  // Only render once mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <AuthContext.Provider value={{ firebaseUser: null, loading: true }}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

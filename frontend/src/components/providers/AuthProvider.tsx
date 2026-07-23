'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, onIdTokenChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { setUserProfile } from '@/lib/firestore';
import { useAuthStore } from '@/stores/authStore';
import { StudentProfile } from '@/types/api.types';

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
        // Upsert user profile in Firestore on every login
        await setUserProfile(user.uid, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });

        // Sync to Zustand store — works whether backend or Firebase-only mode
        setUser({
          id: user.uid,
          name: user.displayName ?? '',
          email: user.email ?? '',
          photoUrl: user.photoURL ?? '',
          isPremium: false,
          firebaseUid: user.uid,
          createdAt: new Date().toISOString(),
        } as StudentProfile);
      } else {
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

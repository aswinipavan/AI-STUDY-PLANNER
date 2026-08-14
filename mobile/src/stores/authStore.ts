import {create} from 'zustand';
import type {StudentResponse} from '@/types/student.types';
import {clearJwt, saveJwt} from '@/auth/tokenStorage';
import {firebaseSignOut} from '@/auth/firebaseAuth';
import type {AuthResponse} from '@/types/auth.types';

interface AuthState {
  // ── State ─────────────────────────────────────────────────────────────────
  student: StudentResponse | null;
  jwt: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean; // true while restoring session on app start

  // ── Actions ───────────────────────────────────────────────────────────────
  /** Called after successful /api/auth/login or session restore */
  setSession: (authResponse: AuthResponse) => Promise<void>;
  /** Update student profile data (e.g. after PUT /api/students/me) */
  updateStudent: (student: StudentResponse) => void;
  /** Full logout — clear JWT, Firebase session, reset state */
  logout: () => Promise<void>;
  /** Called on app start while we check secure storage */
  setHydrating: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  student: null,
  jwt: null,
  isAuthenticated: false,
  isHydrating: true,

  setSession: async (authResponse: AuthResponse) => {
    await saveJwt(authResponse.token);
    set({
      student: authResponse.student,
      jwt: authResponse.token,
      isAuthenticated: true,
      isHydrating: false,
    });
  },

  updateStudent: (student: StudentResponse) => {
    set({student});
  },

  logout: async () => {
    await clearJwt();
    await firebaseSignOut();
    set({
      student: null,
      jwt: null,
      isAuthenticated: false,
      isHydrating: false,
    });
  },

  setHydrating: (value: boolean) => {
    set({isHydrating: value});
  },
}));

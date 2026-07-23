import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StudentProfile } from '@/types/api.types';

interface AuthState {
  user: StudentProfile | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  setUser: (user: StudentProfile) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isPremium: false,
      setUser: (user) => set({ 
        user, 
        isAuthenticated: true, 
        isPremium: user.isPremium ?? false 
      }),
      clearAuth: () => set({ 
        user: null, 
        isAuthenticated: false, 
        isPremium: false 
      }),
    }),
    { 
      name: 'auth-store', 
      partialize: (s) => ({ user: s.user }) 
    }
  )
);

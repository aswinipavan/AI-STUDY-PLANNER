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
      setUser: (user) => {
        // Normalize backend field names to frontend aliases
        const normalized: StudentProfile = {
          ...user,
          // Backend returns 'fullName', frontend reads '.name'
          name: user.name || user.fullName || '',
          fullName: user.fullName || user.name || '',
          // Backend returns 'profilePictureUrl', frontend reads '.photoUrl'
          photoUrl: user.photoUrl || user.profilePictureUrl || undefined,
          profilePictureUrl: user.profilePictureUrl || user.photoUrl || undefined,
        };
        set({ 
          user: normalized, 
          isAuthenticated: true, 
          isPremium: normalized.isPremium ?? false 
        });
      },
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

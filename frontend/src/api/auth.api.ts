import { apiClient } from '@/lib/apiClient';
import { StudentProfile } from '@/types/api.types';

export const authApi = {
  // Uses standard fetch because it hits our Next.js Proxy to set httpOnly cookies
  login: async (firebaseToken: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },
  
  // Uses standard fetch because it hits our Next.js Proxy to refresh httpOnly cookies
  refresh: async () => {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!res.ok) throw new Error('Refresh failed');
    return res.json();
  },

  // These use the global apiClient to hit the backend directly
  getMe: async (): Promise<StudentProfile> => {
    const response = await apiClient.get('/api/students/me');
    return response.data;
  },

  updateMe: async (data: Partial<StudentProfile>): Promise<StudentProfile> => {
    const response = await apiClient.put('/api/students/me', data);
    return response.data;
  },
};

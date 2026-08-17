import axios from 'axios';
import { normaliseError } from '@/utils/errorHandler';
import { auth } from '@/lib/firebase';

export const apiClient = axios.create({
  baseURL: '', // Route through Next.js API proxy (same origin) to attach httpOnly auth cookie
  timeout: 45000, // 45s timeout for AI generation and cold-start requests
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // 401 — Auto-refresh → silent retry → logout if refresh fails
    if (status === 401 && !original._retry) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // Get current Firebase user's ID token
          const currentUser = auth.currentUser;
          if (!currentUser) {
            throw new Error('No user authenticated');
          }

          const firebaseToken = await currentUser.getIdToken(true);

          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebaseToken }),
          });

          if (!refreshRes.ok) {
            throw new Error(`Refresh failed with status ${refreshRes.status}`);
          }
        } catch (refreshErr) {
          // Refresh failed (network error or HTTP error) — redirect to login
          console.error('[apiClient] Token refresh failed:', refreshErr);
          isRefreshing = false;
          queue = [];
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(normaliseError(error));
        }
        isRefreshing = false;
        queue.forEach((cb) => cb(''));
        queue = [];
      }

      return apiClient(original);
    }

    return Promise.reject(normaliseError(error));
  }
);

import axios from 'axios';
import { normaliseError } from '@/utils/errorHandler';
import { ENV } from '@/constants/config';

export const apiClient = axios.create({
  baseURL: ENV.BACKEND_URL,
  timeout: 15000, // axios timeout 15s — blueprint spec
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
          const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
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

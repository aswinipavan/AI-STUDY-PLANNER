import axios from 'axios';
import { normaliseError } from '@/utils/errorHandler';
import { auth } from '@/lib/firebase';

export const apiClient = axios.create({
  baseURL: '', // Route through Next.js API proxy (same origin) to attach httpOnly auth cookie
  timeout: 45000, // 45s timeout for AI generation and cold-start requests
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// A single in-flight refresh shared by all concurrent 401s, so we never fire N parallel
// refreshes (which caused request storms) and every waiter retries once the cookie is renewed.
let refreshPromise: Promise<boolean> | null = null;
let isRedirecting = false;

/**
 * Perform one token refresh. Returns true only if the backend minted a fresh session cookie.
 * Waits for Firebase to finish restoring persisted auth first — on a cold page load
 * `auth.currentUser` is briefly null even for a signed-in user, and acting on that produced
 * spurious logout/redirect churn (the "dashboard blink").
 */
async function doRefresh(): Promise<boolean> {
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    const firebaseToken = await currentUser.getIdToken(true);
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[apiClient] Token refresh failed:', err);
    return false;
  }
}

/**
 * Clear the stale httpOnly cookie, then redirect to /login. Clearing the cookie is essential:
 * proxy.ts treats any present cookie as "authenticated" and would otherwise bounce /login back
 * to /dashboard, producing an infinite redirect loop.
 */
async function clearSessionAndRedirect(): Promise<void> {
  if (typeof window === 'undefined' || isRedirecting) return;
  const path = window.location.pathname;
  if (path === '/login' || path === '/') return;
  isRedirecting = true;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Best-effort cookie clear; navigate regardless.
  }
  window.location.href = '/login';
}

apiClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // 401 or 403 — session expired or unauthenticated. Attempt exactly one recovery per request.
    if ((status === 401 || status === 403) && original && !original._retry) {
      original._retry = true;

      // Share a single refresh across all concurrent failures.
      let pending = refreshPromise;
      if (!pending) {
        pending = doRefresh();
        refreshPromise = pending;
        pending.finally(() => {
          if (refreshPromise === pending) refreshPromise = null;
        });
      }

      const refreshed = await pending;
      if (refreshed) {
        // Cookie renewed server-side — retry the original request.
        return apiClient(original);
      }

      // Could not refresh (no user, or Firebase/backend rejected) — clear and bounce to login.
      await clearSessionAndRedirect();
      return Promise.reject(normaliseError(error));
    }

    return Promise.reject(normaliseError(error));
  }
);

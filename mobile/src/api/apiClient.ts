import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import {CONFIG} from '@/constants/config';
import {getJwt, clearJwt, saveJwt} from '@/auth/tokenStorage';
import {getCurrentIdToken, firebaseSignOut} from '@/auth/firebaseAuth';
import type {ApiError} from '@/types/api.types';

/**
 * Axios instance that communicates directly with the Spring Boot backend.
 * Unlike the web app there is NO Next.js proxy — mobile sends
 * Authorization: Bearer <jwt> directly to Render.
 *
 * The host comes from CONFIG.BACKEND_URL — see mobile/src/constants/config.ts.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: CONFIG.BACKEND_URL,
  timeout: CONFIG.REQUEST_TIMEOUT_MS,
  headers: {'Content-Type': 'application/json'},
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const jwt = await getJwt();
    if (jwt) {
      config.headers.Authorization = `Bearer ${jwt}`;
    }
    console.log('[API REQ]', config.method?.toUpperCase(), config.url);
    return config;
  },
  error => Promise.reject(error),
);

// ─── Response interceptor: handle 401, normalize errors ──────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (jwt: string) => void;
  reject: (error: unknown) => void;
}> = [];

function flushQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(p => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token!);
    }
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  response => {
    console.log('[API RES]', response.status, response.config.url);
    return response;
  },
  async (error: AxiosError) => {
    console.log('[API ERR]', error.response?.status, error.config?.url, JSON.stringify(error.response?.data));
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ── 401: Token refresh flow ──────────────────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Wait for the in-flight refresh to complete
        return new Promise<string>((resolve, reject) => {
          pendingQueue.push({resolve, reject});
        }).then(newJwt => {
          originalRequest.headers.Authorization = `Bearer ${newJwt}`;
          return apiClient(originalRequest);
        });
      }

      isRefreshing = true;
      try {
        // Get a fresh Firebase ID token
        const firebaseToken = await getCurrentIdToken(true);
        if (!firebaseToken) {
          throw new Error('No Firebase user — cannot refresh');
        }

        // Call backend refresh endpoint using the Firebase-Token header
        // (mirrors what the Next.js proxy does server-side)
        const refreshResponse = await axios.post<{
          data: {token: string; student: unknown};
        }>(
          `${CONFIG.BACKEND_URL}/api/auth/refresh`,
          {},
          {
            headers: {
              'Firebase-Token': firebaseToken,
              'Content-Type': 'application/json',
            },
            timeout: CONFIG.REQUEST_TIMEOUT_MS,
          },
        );

        const newJwt = refreshResponse.data.data.token;
        await saveJwt(newJwt);
        flushQueue(null, newJwt);
        originalRequest.headers.Authorization = `Bearer ${newJwt}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError, null);
        // Refresh failed — clear session and force login
        await clearJwt();
        await firebaseSignOut();
        // The authStore listener will pick up the Firebase sign-out event
        // and navigate to LoginScreen via RootNavigator
        return Promise.reject(normalizeError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

/**
 * Normalize Axios errors into a consistent ApiError shape.
 * Never logs tokens or sensitive data.
 */
export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const isNetworkError = !error.response;
    const isTimeout =
      error.code === 'ECONNABORTED' || error.message?.includes('timeout');

    let message = 'Something went wrong. Please try again.';

    if (isTimeout) {
      message =
        'Request timed out. The server may be warming up — please try again in a moment.';
    } else if (isNetworkError) {
      message = 'No internet connection. Please check your network.';
    } else {
      switch (status) {
        case 400:
          message = 'Invalid request. Please check your input.';
          break;
        case 401:
          message = 'Session expired. Please log in again.';
          break;
        case 403:
          message = 'You do not have permission to do this.';
          break;
        case 404:
          message = 'Resource not found.';
          break;
        case 422:
          message = 'Validation failed. Please check your input.';
          break;
        case 429:
          message = 'Too many requests. Please slow down.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        default:
          message =
            (error.response?.data as {message?: string})?.message ??
            'An unexpected error occurred.';
      }
    }

    return {
      message,
      status,
      isNetworkError,
      isTimeout,
    };
  }

  return {
    message:
      error instanceof Error ? error.message : 'An unexpected error occurred.',
    status: 0,
    isNetworkError: false,
    isTimeout: false,
  };
}

export default apiClient;

import axios from 'axios';
import {CONFIG} from '@/constants/config';
import type {ApiResponse} from '@/types/api.types';
import type {AuthResponse, LoginRequest} from '@/types/auth.types';

/**
 * Auth API — uses plain axios (no auth interceptor, these are public endpoints)
 * POST /api/auth/login  → { firebaseToken }
 * POST /api/auth/refresh → Firebase-Token header
 */

const authAxios = axios.create({
  baseURL: CONFIG.BACKEND_URL,
  timeout: CONFIG.REQUEST_TIMEOUT_MS,
  headers: {'Content-Type': 'application/json'},
});

/**
 * Exchange a Firebase ID token for a backend JWT.
 * POST /api/auth/login
 */
export async function loginWithFirebaseToken(
  firebaseToken: string,
): Promise<AuthResponse> {
  const body: LoginRequest = {firebaseToken};
  const res = await authAxios.post<ApiResponse<AuthResponse>>(
    '/api/auth/login',
    body,
  );
  return res.data.data;
}

/**
 * Refresh the backend JWT using a fresh Firebase ID token.
 * POST /api/auth/refresh  (Firebase-Token header, no body)
 */
export async function refreshBackendToken(
  firebaseIdToken: string,
): Promise<AuthResponse> {
  const res = await authAxios.post<ApiResponse<AuthResponse>>(
    '/api/auth/refresh',
    {},
    {
      headers: {'Firebase-Token': firebaseIdToken},
    },
  );
  return res.data.data;
}

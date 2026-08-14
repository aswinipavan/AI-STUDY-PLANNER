import type {StudentResponse} from './student.types';

/**
 * Mirrors backend AuthResponse DTO
 * POST /api/auth/login → { token, student, isNewUser }
 */
export interface AuthResponse {
  token: string;
  student: StudentResponse;
  isNewUser: boolean;
}

/**
 * Request body for POST /api/auth/login
 */
export interface LoginRequest {
  firebaseToken: string;
}

import type {ApiError} from '@/types/api.types';

/**
 * Get a user-facing message from any error value.
 * Use this in catch blocks in screens/components.
 */
export function getErrorMessage(error: unknown): string {
  if (!error) {return 'An unexpected error occurred.';}

  // ApiError (thrown by apiClient interceptor)
  if (typeof error === 'object' && 'message' in error && 'status' in error) {
    return (error as ApiError).message;
  }

  let msg = '';
  if (error instanceof Error) {
    msg = error.message;
  } else if (typeof error === 'string') {
    msg = error;
  } else if (typeof error === 'object' && 'message' in (error as any)) {
    msg = String((error as any).message);
  }

  if (msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('auth/invalid-credential') || lower.includes('invalid_login_credentials')) {
      return 'Invalid email or password. Please check your credentials or switch to Register if you do not have an account.';
    }
    if (lower.includes('auth/user-not-found') || lower.includes('email_not_found')) {
      return 'No account found with this email. Please register to create your account.';
    }
    if (lower.includes('auth/wrong-password') || lower.includes('invalid_password')) {
      return 'Incorrect password. Please verify your password and try again.';
    }
    if (lower.includes('auth/email-already-in-use') || lower.includes('email_exists')) {
      return 'An account with this email already exists. Please switch to Sign In.';
    }
    if (lower.includes('auth/weak-password') || lower.includes('weak_password')) {
      return 'Password must be at least 6 characters.';
    }
    if (lower.includes('auth/network-request-failed') || lower.includes('network_error')) {
      return 'Network connection failed. Please check your internet connection.';
    }
    if (lower.includes('auth/too-many-requests') || lower.includes('too_many_attempts_try_later')) {
      return 'Too many failed login attempts. Please try again in a few minutes.';
    }
    return msg;
  }

  return 'An unexpected error occurred.';
}

/**
 * Returns true if the error is a network connectivity issue.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'isNetworkError' in error) {
    return (error as ApiError).isNetworkError;
  }
  return false;
}

/**
 * Returns true if the error is a timeout (Render cold start scenario).
 */
export function isTimeoutError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'isTimeout' in error) {
    return (error as ApiError).isTimeout;
  }
  return false;
}

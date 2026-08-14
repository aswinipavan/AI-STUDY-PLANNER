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

  if (error instanceof Error) {
    return error.message;
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

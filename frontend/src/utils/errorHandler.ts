import axios from 'axios';

export class AppError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK' | 'AUTH' | 'PREMIUM' | 'VALIDATION' | 'SERVER' | 'FORBIDDEN',
    public statusCode?: number,
    public fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const normaliseError = (error: unknown): AppError => {
  if (axios.isAxiosError(error)) {
    const s = error.response?.status;

    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return new AppError('AI request timed out. Please try again.', 'NETWORK');
    }

    if (!error.response) return new AppError('Unable to reach the server. Please check your connection.', 'NETWORK');
    if (s === 401) return new AppError('Session expired — please sign in again.', 'AUTH', 401);
    // 403 in this app means the session token is invalid or the student record doesn't exist yet.
    // It is NOT a premium paywall — the AI chat is available to all authenticated users.
    if (s === 403) return new AppError('Session expired — please sign out and sign in again.', 'AUTH', 403);
    if (s === 404) return new AppError('The requested resource was not found.', 'SERVER', 404);
    if (s === 422) return new AppError('Validation failed', 'VALIDATION', 422, error.response.data?.errors);
    if (s === 429) return new AppError('Too many requests. Please wait a moment and try again.', 'SERVER', 429);
    if (s !== undefined && s >= 500) return new AppError('Something went wrong on the server. Please try again.', 'SERVER', s);
    // Preserve the status code for any other HTTP error so callers can branch on it.
    if (s !== undefined) return new AppError('Request failed. Please try again.', 'SERVER', s);
  }

  return new AppError('Unexpected error', 'SERVER');
};

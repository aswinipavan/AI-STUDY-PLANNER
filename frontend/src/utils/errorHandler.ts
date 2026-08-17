import axios from 'axios';

export class AppError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK' | 'AUTH' | 'PREMIUM' | 'VALIDATION' | 'SERVER',
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
    if (s === 401) return new AppError('Session expired', 'AUTH', 401);
    if (s === 403) return new AppError('Premium required', 'PREMIUM', 403);
    if (s === 422) return new AppError('Validation failed', 'VALIDATION', 422, error.response.data?.errors);
    if (s !== undefined && s >= 500) return new AppError('Something went wrong, try again', 'SERVER', s);
  }

  return new AppError('Unexpected error', 'SERVER');
};

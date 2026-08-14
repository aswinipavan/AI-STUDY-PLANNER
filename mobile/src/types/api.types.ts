/**
 * Generic API response wrapper — mirrors Spring Boot ApiResponse<T>
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

/**
 * Spring Boot Page<T> wrapper for paginated responses
 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

/**
 * Normalized API error thrown by the Axios interceptor
 */
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  isNetworkError: boolean;
  isTimeout: boolean;
}

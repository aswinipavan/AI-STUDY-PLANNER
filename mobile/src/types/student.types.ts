/**
 * Mirrors backend StudentResponse DTO
 * GET /api/students/me
 */
export interface StudentResponse {
  id: string; // UUID
  firebaseUid: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  collegeName: string | null;
  semester: number | null;
  department: string | null;
  isPremium: boolean;
  studyStreak: number;
  availableHoursPerDay: number; // BigDecimal from backend
  profilePictureUrl: string | null;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

/**
 * Mirrors backend SubjectResponse DTO
 */
export interface SubjectResponse {
  id: string; // UUID
  subjectName: string;
  subjectCode: string | null;
  credits: number | null;
  difficultyLevel: number; // 1-5
  semester: number | null;
  createdAt: string; // ISO datetime
}

/**
 * Mirrors backend SubjectRequest DTO
 * POST/PUT /api/students/me/subjects
 */
export interface SubjectRequest {
  subjectName: string;
  subjectCode?: string;
  credits?: number;
  difficultyLevel?: number;
  semester?: number;
}

/**
 * Mirrors backend UpdateProfileRequest DTO
 * PUT /api/students/me
 */
export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  collegeName?: string;
  semester?: number;
  department?: string;
  availableHoursPerDay?: number;
}

/**
 * Mirrors backend NotificationPreferencesRequest DTO
 * PUT /api/students/me/notifications
 */
export interface NotificationPreferencesRequest {
  emailNotifications: boolean;
  pushNotifications: boolean;
}

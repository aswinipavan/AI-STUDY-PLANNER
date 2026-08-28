import { apiClient } from '@/lib/apiClient';
import { StudentProfile } from '@/types/api.types';

// Backend wraps all responses in ApiResponse<T> = { success, message, data }
type ApiResponse<T> = { success: boolean; message: string; data: T };

export const authApi = {
  // Uses standard fetch because it hits our Next.js Proxy to set httpOnly cookies
  login: async (firebaseToken: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },
  
  // Uses standard fetch because it hits our Next.js Proxy to refresh httpOnly cookies
  refresh: async () => {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!res.ok) throw new Error('Refresh failed');
    return res.json();
  },

  // These use the global apiClient to hit the backend directly
  getMe: async (): Promise<StudentProfile> => {
    const response = await apiClient.get<ApiResponse<StudentProfile>>('/api/students/me');
    return response.data.data ?? response.data as unknown as StudentProfile;
  },

  updateMe: async (data: Partial<StudentProfile>): Promise<StudentProfile> => {
    // Map frontend field names to backend field names
    const payload: Record<string, unknown> = {
      fullName: data.name !== undefined ? data.name : data.fullName,
      email: data.email,
      collegeName: data.collegeName,
      semester: data.semester,
      department: data.department,
      phoneNumber: data.phoneNumber,
      availableHoursPerDay: data.availableHoursPerDay,
      preferredStudyTime: data.preferredStudyTime,
      profilePictureUrl: data.profilePictureUrl || data.photoUrl,
    };
    // Remove undefined values to avoid overwriting with null
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    const response = await apiClient.put<ApiResponse<StudentProfile>>('/api/students/me', payload);
    return response.data.data ?? response.data as unknown as StudentProfile;
  },

  updateNotifications: async (prefs: { emailNotifications: boolean; pushNotifications: boolean }): Promise<StudentProfile> => {
    const response = await apiClient.put<ApiResponse<StudentProfile>>('/api/students/me/notifications', prefs);
    return response.data.data ?? response.data as unknown as StudentProfile;
  },

  getAvatarUploadUrl: async (fileName: string, fileType: string): Promise<{ uploadUrl: string; fileUrl: string; anonKey: string }> => {
    const params = new URLSearchParams({ fileName, fileType });
    const response = await apiClient.post<ApiResponse<{ uploadUrl: string; fileUrl: string; anonKey: string }>>(
      `/api/students/me/avatar-upload-url?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Upload a new profile avatar in a single multipart request and return the updated profile.
   *
   * Uses native fetch (not the axios apiClient) so the browser sets the multipart boundary itself.
   * The request goes through the Next.js proxy, which attaches the httpOnly auth cookie. The backend
   * stores the image (Supabase or local FS) and persists the cache-busted URL on the profile.
   */
  uploadAvatar: async (file: File): Promise<StudentProfile> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/students/me/avatar', {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    if (!res.ok) {
      let message = `Upload failed (${res.status})`;
      try {
        const err = await res.json();
        message = err.message || err.error || message;
      } catch {
        // response body was not JSON; keep the status-based message
      }
      throw new Error(message);
    }
    const data = await res.json();
    return data.data ?? data;
  },

  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/api/students/me');
  },
};


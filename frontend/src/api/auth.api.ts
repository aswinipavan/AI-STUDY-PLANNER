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
      fullName: data.name || data.fullName, // backend expects 'fullName'
      email: data.email,
      collegeName: data.collegeName,
      semester: data.semester,
      department: data.department,
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

  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/api/students/me');
  },
};


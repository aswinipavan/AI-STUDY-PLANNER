import { apiClient } from '@/lib/apiClient';
import { StudyMaterial } from '@/types/api.types';

export const materialsApi = {
  /**
   * Upload a file and persist its metadata in a single multipart request.
   *
   * Uses the native fetch API (not the axios apiClient) so the browser sets the
   * `multipart/form-data; boundary=...` Content-Type itself. The request goes through the Next.js
   * proxy, which attaches the httpOnly auth cookie and forwards the raw bytes to the backend.
   */
  upload: async (
    file: File,
    meta: { title: string; subjectId?: string; textPreview?: string }
  ): Promise<StudyMaterial> => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', meta.title);
    if (meta.subjectId) form.append('subjectId', meta.subjectId);
    if (meta.textPreview) form.append('textPreview', meta.textPreview);

    const res = await fetch('/api/materials/upload', {
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

  getUploadUrl: async (filename: string, fileType: string): Promise<{ uploadUrl: string; fileUrl: string }> => {
    const response = await apiClient.get(`/api/materials/upload-url`, {
      params: {
        fileName: filename,
        fileType: fileType,
      },
    });
    // Backend returns ApiResponse<Map<String, String>>
    // Extract the actual data from the wrapper
    return response.data.data || response.data;
  },

  save: async (
    meta: Partial<StudyMaterial>,
    fileUrl: string,
    fileType: string,
    fileSizeBytes: number
  ): Promise<StudyMaterial> => {
    const response = await apiClient.post(
      '/api/materials/',
      meta,
      {
        params: {
          fileUrl,
          fileType,
          fileSizeBytes,
        },
      }
    );
    // Backend returns ApiResponse<MaterialResponse>
    return response.data.data || response.data;
  },

  getAll: async (): Promise<StudyMaterial[]> => {
    const response = await apiClient.get('/api/materials/');
    // Backend returns ApiResponse<List<MaterialResponse>>
    return response.data.data || response.data;
  },

  getBySubject: async (id: string): Promise<StudyMaterial[]> => {
    const response = await apiClient.get(`/api/materials/subject/${id}`);
    // Backend returns ApiResponse<List<MaterialResponse>>
    return response.data.data || response.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/materials/${id}`);
  },

  reprocess: async (id: string): Promise<StudyMaterial> => {
    const response = await apiClient.post(`/api/materials/${id}/process`);
    return response.data.data || response.data;
  },
};

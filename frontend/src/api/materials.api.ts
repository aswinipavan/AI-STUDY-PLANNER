import { apiClient } from '@/lib/apiClient';
import { StudyMaterial } from '@/types/api.types';

export const materialsApi = {
  getUploadUrl: async (filename: string, fileType: string): Promise<{ uploadUrl: string; fileUrl: string }> => {
    const response = await apiClient.get(`/api/materials/upload-url`, {
      params: {
        fileName: filename,
        fileType: fileType,
      },
    });
    return response.data;
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
    return response.data;
  },

  getAll: async (): Promise<StudyMaterial[]> => {
    const response = await apiClient.get('/api/materials/');
    return response.data;
  },

  getBySubject: async (id: string): Promise<StudyMaterial[]> => {
    const response = await apiClient.get(`/api/materials/subject/${id}`);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/materials/${id}`);
  },
};

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

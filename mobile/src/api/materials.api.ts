import apiClient from './apiClient';
import type {ApiResponse} from '@/types/api.types';
import type {
  MaterialResponse,
  MaterialUploadRequest,
  StorageUploadUrlResponse,
} from '@/types/material.types';

/**
 * Study Materials API
 */

/** GET /api/materials/ */
export async function getMaterials(): Promise<MaterialResponse[]> {
  const res = await apiClient.get<ApiResponse<MaterialResponse[]>>(
    '/api/materials/',
  );
  return res.data.data;
}

/** GET /api/materials/subject/{subjectId} */
export async function getMaterialsBySubject(
  subjectId: string,
): Promise<MaterialResponse[]> {
  const res = await apiClient.get<ApiResponse<MaterialResponse[]>>(
    `/api/materials/subject/${subjectId}`,
  );
  return res.data.data;
}

/** GET /api/materials/upload-url */
export async function getStorageUploadUrl(
  fileName: string,
  fileType?: string,
): Promise<StorageUploadUrlResponse> {
  const res = await apiClient.get<ApiResponse<StorageUploadUrlResponse>>(
    '/api/materials/upload-url',
    {
      params: {fileName, fileType},
    },
  );
  return res.data.data;
}

/** POST /api/materials/ */
export async function saveMaterialMetadata(
  request: MaterialUploadRequest,
  fileUrl: string,
  fileType: string,
  fileSizeBytes: number,
): Promise<MaterialResponse> {
  const res = await apiClient.post<ApiResponse<MaterialResponse>>(
    '/api/materials/',
    request,
    {
      params: {fileUrl, fileType, fileSizeBytes},
    },
  );
  return res.data.data;
}

/** DELETE /api/materials/{materialId} */
export async function deleteMaterial(materialId: string): Promise<void> {
  await apiClient.delete(`/api/materials/${materialId}`);
}

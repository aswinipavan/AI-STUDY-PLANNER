import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {QK} from '@/constants/queryKeys';
import {
  getMaterials,
  getMaterialsBySubject,
  saveMaterialMetadata,
  deleteMaterial,
} from '@/api/materials.api';
import type {MaterialUploadRequest} from '@/types/material.types';

/** Fetch all study materials */
export function useMaterials() {
  return useQuery({
    queryKey: QK.MATERIALS,
    queryFn: getMaterials,
  });
}

/** Fetch materials by subject */
export function useMaterialsBySubject(subjectId: string) {
  return useQuery({
    queryKey: QK.MATERIALS_BY_SUBJECT(subjectId),
    queryFn: () => getMaterialsBySubject(subjectId),
    enabled: Boolean(subjectId),
  });
}

/** Save new material metadata */
export function useSaveMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      request,
      fileUrl,
      fileType,
      fileSizeBytes,
    }: {
      request: MaterialUploadRequest;
      fileUrl: string;
      fileType: string;
      fileSizeBytes: number;
    }) => saveMaterialMetadata(request, fileUrl, fileType, fileSizeBytes),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QK.MATERIALS});
    },
  });
}

/** Delete a study material */
export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) => deleteMaterial(materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QK.MATERIALS});
    },
  });
}

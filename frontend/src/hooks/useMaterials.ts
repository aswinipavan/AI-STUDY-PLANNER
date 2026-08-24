import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi } from '@/api/materials.api';
import { QK } from '@/constants/queryKeys';
import { StudyMaterial } from '@/types/api.types';
import { useBackendHealth } from '@/hooks/useBackendHealth';

interface UploadPayload {
  file: File;
  title: string;
  subjectId: string;
}

export const useMaterials = () => {
  const { isReady } = useBackendHealth();
  return useQuery({
    queryKey: QK.materials,
    queryFn: materialsApi.getAll,
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
};

export const useUploadMaterial = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, title, subjectId }: UploadPayload) => {
      // Extract a text preview for text/markdown files so the backend can summarise them.
      let textPreview: string | undefined = undefined;
      if (
        file.type.startsWith('text/') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.json')
      ) {
        try {
          const text = await file.text();
          textPreview = text.slice(0, 3000);
        } catch {
          // ignore preview extraction error
        }
      }

      // Single multipart request: the backend stores the bytes (Supabase or local FS) and persists
      // the metadata. Replaces the old three-step signed-URL flow that failed with HTTP 400 locally.
      return materialsApi.upload(file, { title, subjectId, textPreview });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.materials }),
  });
};


export const useDeleteMaterial = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
       await materialsApi.remove(id);
       return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK.materials });
      const prev = qc.getQueryData<StudyMaterial[]>(QK.materials);
      qc.setQueryData(QK.materials, (old: StudyMaterial[] | undefined) => 
        old ? old.filter(m => m.id !== id) : []
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK.materials, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK.materials }),
  });
};

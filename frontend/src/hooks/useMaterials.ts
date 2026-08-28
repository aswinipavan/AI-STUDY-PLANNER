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
  return useQuery<StudyMaterial[]>({
    queryKey: QK.materials,
    queryFn: () => materialsApi.getAll(),
    enabled: isReady,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    // Document intelligence runs asynchronously on the backend, so a freshly
    // uploaded file arrives as PENDING and its topics appear seconds later. Poll
    // only while something is actually in flight and stop the moment everything
    // has settled — otherwise a student watched "Processing…" until they thought
    // to reload the page.
    refetchInterval: (query) => {
      const data = query.state.data as StudyMaterial[] | undefined;
      if (!data?.length) return false;
      const inFlight = data.some(
        (m) => m.processingStatus === 'PENDING' || m.processingStatus === 'PROCESSING'
      );
      return inFlight ? 4000 : false;
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.materials });
      // A new file means new topics to cover, so the coverage and readiness
      // signals behind the ranking are stale. The schedule itself is only
      // re-planned when the student asks for it — see useAdaptTimetable.
      qc.invalidateQueries({ queryKey: QK.timetableInsights });
      qc.invalidateQueries({ queryKey: QK.readiness });
    },
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

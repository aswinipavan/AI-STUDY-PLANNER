import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi } from '@/api/materials.api';
import { QK } from '@/constants/queryKeys';
import { StudyMaterial } from '@/types/api.types';

interface UploadPayload {
  file: File;
  title: string;
  subjectId: string;
}

export const useMaterials = () => {
  return useQuery({
    queryKey: QK.materials,
    queryFn: materialsApi.getAll,
  });
};

export const useUploadMaterial = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ file, title, subjectId }: UploadPayload) => {
      // 1. Get upload URL + auth key from backend
      const uploadInfo = await materialsApi.getUploadUrl(file.name, file.type);
      const { uploadUrl, fileUrl, anonKey } = uploadInfo as { uploadUrl: string; fileUrl: string; anonKey?: string };
      
      if (!uploadUrl) {
        throw new Error('Failed to get upload URL from server');
      }

      // 2. Direct upload to Supabase Storage with required auth headers
      // FIXED: Supabase requires Authorization + apikey headers, otherwise returns 401
      const uploadHeaders: Record<string, string> = {
        'Content-Type': file.type,
      };
      if (anonKey) {
        uploadHeaders['Authorization'] = `Bearer ${anonKey}`;
        uploadHeaders['apikey'] = anonKey;
      }

      const res = await fetch(uploadUrl, {
        method: 'PUT', 
        body: file,
        headers: uploadHeaders,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Failed to upload file to storage (${res.status}): ${errText}`);
      }
      
      // 3. Extract text preview for text/markdown files for AI summarization
      let textPreview: string | undefined = undefined;
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
        try {
          const text = await file.text();
          textPreview = text.slice(0, 3000);
        } catch {
          // ignore preview extraction error
        }
      }

      // 4. Save metadata - backend expects MaterialUploadRequest format
      let materialType = 'TXT';
      if (file.type.includes('pdf')) materialType = 'PDF';
      else if (file.type.includes('word') || file.type.includes('docx')) materialType = 'DOCX';
      else if (file.type.includes('excel') || file.type.includes('spreadsheet')) materialType = 'XLSX';
      else if (file.type.includes('zip')) materialType = 'ZIP';
      else if (file.type.startsWith('image/')) materialType = 'IMAGE';

      return materialsApi.save(
        { 
          title, 
          subjectId,
          fileName: file.name,
          materialType,
          textPreview,
        } as unknown as Record<string, unknown>,
        fileUrl,
        file.type,
        file.size
      );
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

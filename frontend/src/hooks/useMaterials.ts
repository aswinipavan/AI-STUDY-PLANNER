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
      // 1. Get presigned URL
      const { uploadUrl, fileUrl } = await materialsApi.getUploadUrl(file.name, file.type);
      
      // 2. Direct upload
      const res = await fetch(uploadUrl, {
        method: 'PUT', 
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!res.ok) throw new Error('Failed to upload file');
      
      // 3. Save metadata - backend expects MaterialUploadRequest format
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
          materialType
        } as unknown as Record<string, unknown>, // Using unknown since frontend StudyMaterial type doesn't match backend MaterialUploadRequest
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

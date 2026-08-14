import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {QK} from '@/constants/queryKeys';
import {CONFIG} from '@/constants/config';
import {
  getProfile,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  updateProfile,
} from '@/api/student.api';
import type {SubjectRequest, UpdateProfileRequest} from '@/types/student.types';
import {useAuthStore} from '@/stores/authStore';

/** Fetch current student profile */
export function useProfile() {
  return useQuery({
    queryKey: QK.PROFILE,
    queryFn: getProfile,
    staleTime: CONFIG.STALE_TIME.PROFILE,
  });
}

/** Fetch all subjects */
export function useSubjects() {
  return useQuery({
    queryKey: QK.SUBJECTS,
    queryFn: getSubjects,
    staleTime: CONFIG.STALE_TIME.SUBJECTS,
  });
}

/** Create a new subject */
export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubjectRequest) => createSubject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QK.SUBJECTS});
    },
  });
}

/** Update an existing subject */
export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: {id: string; data: SubjectRequest}) =>
      updateSubject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QK.SUBJECTS});
    },
  });
}

/** Delete a subject */
export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QK.SUBJECTS});
      // Timetable slots reference subjects — invalidate timetable too
      queryClient.invalidateQueries({queryKey: QK.TIMETABLE_ACTIVE});
    },
  });
}

/** Update student profile */
export function useUpdateProfile() {
  const updateStudent = useAuthStore(s => s.updateStudent);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateProfile(data),
    onSuccess: student => {
      updateStudent(student);
      queryClient.setQueryData(QK.PROFILE, student);
    },
  });
}

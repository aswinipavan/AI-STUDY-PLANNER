import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {QK} from '@/constants/queryKeys';
import {CONFIG} from '@/constants/config';
import {
  getAllExams,
  getUpcomingExams,
  createExam,
  updateExam,
  deleteExam,
  markExamComplete,
} from '@/api/exam.api';
import type {ExamRequest} from '@/types/exam.types';

/** Fetch all exams */
export function useAllExams() {
  return useQuery({
    queryKey: QK.EXAMS_ALL,
    queryFn: getAllExams,
    staleTime: CONFIG.STALE_TIME.EXAMS,
  });
}

/** Fetch upcoming (incomplete) exams */
export function useUpcomingExams() {
  return useQuery({
    queryKey: QK.EXAMS_UPCOMING,
    queryFn: getUpcomingExams,
    staleTime: CONFIG.STALE_TIME.EXAMS,
  });
}

/** Create a new exam */
export function useCreateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamRequest) => createExam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QK.EXAMS_ALL});
      queryClient.invalidateQueries({queryKey: QK.EXAMS_UPCOMING});
    },
  });
}

/** Update an exam */
export function useUpdateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: {id: string; data: ExamRequest}) =>
      updateExam(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QK.EXAMS_ALL});
      queryClient.invalidateQueries({queryKey: QK.EXAMS_UPCOMING});
    },
  });
}

/** Mark an exam as complete */
export function useMarkExamComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examId: string) => markExamComplete(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QK.EXAMS_ALL});
      queryClient.invalidateQueries({queryKey: QK.EXAMS_UPCOMING});
    },
  });
}

/** Delete an exam */
export function useDeleteExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examId: string) => deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: QK.EXAMS_ALL});
      queryClient.invalidateQueries({queryKey: QK.EXAMS_UPCOMING});
    },
  });
}

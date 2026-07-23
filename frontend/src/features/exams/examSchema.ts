import { z } from 'zod';

export const examSchema = z.object({
  subjectId: z.string().min(1, 'Please select a subject'),
  examDate: z.string().min(1, 'Date is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  notes: z.string().max(500).optional(),
});

export type ExamFormData = z.infer<typeof examSchema>;

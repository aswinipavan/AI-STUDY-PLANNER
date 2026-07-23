import { z } from 'zod';

export const subjectSchema = z.object({
  name: z.string().min(2, 'Min 2 chars').max(50, 'Max 50 chars'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  targetHours: z.number().min(1).max(20).optional(),
  icon: z.string().optional(),
});

export type SubjectFormData = z.infer<typeof subjectSchema>;

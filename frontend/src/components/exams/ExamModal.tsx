'use client';

import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SlideOver } from '@/components/modals/SlideOver';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useCreateExam } from '@/hooks/useExams';
import { Exam } from '@/types/api.types';
import { examsApi } from '@/api/exams.api';
import { useQueryClient } from '@tanstack/react-query';
import { useSubjects } from '@/hooks/useSubjects';
import { QK } from '@/constants/queryKeys';

const examSchema = z.object({
  subjectId: z.string().min(1, 'Please select a subject'),
  examDate: z.string().min(1, 'Date is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  notes: z.string().max(200, 'Max 200 characters').optional(),
});

type ExamFormData = z.infer<typeof examSchema>;

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'text-green-600 border-green-500/30 bg-green-500/10' },
  { value: 'medium', label: 'Medium', color: 'text-amber-600 border-amber-500/30 bg-amber-500/10' },
  { value: 'hard', label: 'Hard', color: 'text-destructive border-destructive/30 bg-destructive/10' },
] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editExam?: Exam | null;
}

export function ExamModal({ isOpen, onClose, editExam }: Props) {
  const qc = useQueryClient();
  const isEditing = !!editExam;
  const { data: subjects = [] } = useSubjects();

  const { register, handleSubmit, setValue, control, reset, formState: { errors, isSubmitting } } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      subjectId: '',
      examDate: '',
      difficulty: 'medium',
      notes: '',
    },
  });

  const selectedDifficulty = useWatch({ control, name: 'difficulty' });

  useEffect(() => {
    if (editExam) {
      reset({
        subjectId: editExam.subjectId,
        examDate: editExam.examDate.split('T')[0],
        difficulty: editExam.difficulty,
        notes: editExam.notes || '',
      });
    } else {
      reset({ subjectId: '', examDate: '', difficulty: 'medium', notes: '' });
    }
  }, [editExam, reset]);

  const { mutateAsync: createExam } = useCreateExam();

  const onSubmit = async (data: ExamFormData) => {
    if (isEditing && editExam) {
      await examsApi.update(editExam.id, data);
      qc.invalidateQueries({ queryKey: QK.exams });
    } else {
      await createExam(data);
    }
    onClose();
  };

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Exam' : 'Add New Exam'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Subject</label>
          <select
            {...register('subjectId')}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">Select a subject...</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
          {errors.subjectId && <p className="text-destructive text-xs mt-1">{errors.subjectId.message}</p>}
        </div>

        <AppInput
          label="Exam Date"
          type="date"
          min={new Date().toISOString().split('T')[0]}
          error={errors.examDate?.message}
          {...register('examDate')}
        />

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Difficulty</label>
          <div className="flex gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setValue('difficulty', d.value)}
                className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all ${
                  selectedDifficulty === d.value ? d.color : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Notes (optional)</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="e.g. Chapters 1–5, focus on thermodynamics..."
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary outline-none resize-none"
          />
          {errors.notes && <p className="text-destructive text-xs mt-1">{errors.notes.message}</p>}
        </div>

        <div className="pt-4 flex gap-3">
          <AppButton type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" className="flex-1" loading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Add Exam'}
          </AppButton>
        </div>
      </form>
    </SlideOver>
  );
}

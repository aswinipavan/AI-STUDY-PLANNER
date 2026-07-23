'use client';

import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SlideOver } from '@/components/modals/SlideOver';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useCreateSubject } from '@/hooks/useSubjects';
import { Subject } from '@/types/api.types';
import { subjectsApi } from '@/api/subjects.api';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';

const SUBJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
];

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(50, 'Max 50 characters'),
  color: z.string().optional(),
  targetHours: z.number().min(0, 'Min 0').max(100, 'Max 100').optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editSubject?: Subject | null;
}

export function SubjectModal({ isOpen, onClose, editSubject }: Props) {
  const qc = useQueryClient();
  const isEditing = !!editSubject;

  const { register, handleSubmit, setValue, control, reset, formState: { errors, isSubmitting } } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: '', color: SUBJECT_COLORS[0], targetHours: undefined },
  });

  const selectedColor = useWatch({ control, name: 'color' });

  useEffect(() => {
    if (editSubject) {
      reset({
        name: editSubject.name,
        color: editSubject.color || SUBJECT_COLORS[0],
        targetHours: editSubject.targetHours,
      });
    } else {
      reset({ name: '', color: SUBJECT_COLORS[0], targetHours: undefined });
    }
  }, [editSubject, reset]);

  const { mutateAsync: createSubject } = useCreateSubject();

  const onSubmit = async (data: SubjectFormData) => {
    if (isEditing && editSubject) {
      await subjectsApi.update(editSubject.id, data);
      qc.invalidateQueries({ queryKey: QK.subjects });
    } else {
      await createSubject(data);
    }
    onClose();
  };

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Subject' : 'Add New Subject'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <AppInput
          label="Subject Name"
          placeholder="e.g. Mathematics, Physics..."
          error={errors.name?.message}
          {...register('name')}
        />

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Colour</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setValue('color', color)}
                className={`w-8 h-8 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Target Hours (optional)</label>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="e.g. 40"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
            {...register('targetHours', { valueAsNumber: true })}
          />
          {errors.targetHours && <p className="text-destructive text-xs mt-1">{errors.targetHours.message}</p>}
        </div>

        <div className="pt-4 flex gap-3">
          <AppButton type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" className="flex-1" loading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Subject'}
          </AppButton>
        </div>
      </form>
    </SlideOver>
  );
}

'use client';

import React from 'react';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { AppInput } from './AppInput';

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  control: Control<T>;
  error?: string;
  [key: string]: unknown;
}

export function FormField<T extends FieldValues>({
  name,
  label,
  control,
  error,
  ...props
}: FormFieldProps<T>) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <AppInput {...field} {...props} error={error} />
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

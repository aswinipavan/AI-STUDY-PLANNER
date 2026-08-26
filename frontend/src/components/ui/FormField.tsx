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

/**
 * A react-hook-form-bound {@link AppInput}.
 *
 * The label and error markup live in `AppInput` alone — rendering them here as
 * well (as this component used to) showed each field's label and error message
 * twice, and left the outer label with no `htmlFor` to point at.
 */
export function FormField<T extends FieldValues>({
  name,
  label,
  control,
  error,
  ...props
}: FormFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => <AppInput {...field} {...props} label={label} error={error} />}
    />
  );
}

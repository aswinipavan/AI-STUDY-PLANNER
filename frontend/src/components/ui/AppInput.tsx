'use client';

import React, { forwardRef, useId } from 'react';

import { Input } from './input';
import { cn } from '@/lib/utils';

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

/**
 * A labelled text field: the canonical {@link Input} plus a label, an optional
 * leading icon, and an error message that is actually wired to the input for
 * screen readers (`aria-invalid` + `aria-describedby`).
 */
export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  ({ label, error, leftIcon, className, id, ...props }, ref) => {
    // A generated id, not a slug of the label — two fields can share a label
    // text, and `htmlFor` pointing at the wrong input is worse than no label.
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
          <Input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(leftIcon && 'pl-10', className)}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AppInput.displayName = 'AppInput';

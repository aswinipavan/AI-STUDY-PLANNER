'use client';

import React, { forwardRef } from 'react';

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  ({ label, error, leftIcon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-background border rounded-lg py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors ${
              leftIcon ? 'pl-10 pr-4' : 'px-4'
            } ${error ? 'border-destructive focus:ring-destructive' : 'border-border'} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);

AppInput.displayName = 'AppInput';

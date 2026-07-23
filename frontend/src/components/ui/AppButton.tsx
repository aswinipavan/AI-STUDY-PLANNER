'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20',
  outline: 'bg-transparent border border-border text-foreground hover:bg-muted',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

export function AppButton({
  variant = 'primary',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className = '',
  ...props
}: AppButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
}

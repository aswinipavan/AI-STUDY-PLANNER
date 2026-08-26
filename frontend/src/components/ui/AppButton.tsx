'use client';

import React from 'react';

import { Button, type ButtonProps } from './button';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Kept as the name eight call sites already use. It is now a thin adapter over
 * {@link Button}, which owns the actual styling — so there is one button
 * implementation in the app rather than two that drift apart.
 *
 * Prefer importing `Button` directly in new code.
 */
const VARIANT_MAP: Record<Variant, NonNullable<ButtonProps['variant']>> = {
  primary: 'default',
  outline: 'outline',
  ghost: 'ghost',
  danger: 'destructive',
};

export function AppButton({ variant = 'primary', ...props }: AppButtonProps) {
  return <Button variant={VARIANT_MAP[variant]} {...props} />;
}

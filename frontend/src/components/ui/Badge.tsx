import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Standardized Badge Primitive
 * Follows shadcn / Tremor design language with calm, legible contrast and subtle borders.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 font-medium transition-colors select-none",
    "rounded-[var(--app-radius-pill)] border leading-none tracking-tight",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        neutral:
          "border-border bg-muted/60 text-muted-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/30",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:border-amber-500/30",
        destructive:
          "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:border-rose-500/30",
        info:
          "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400 dark:border-sky-500/30",
        purple:
          "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400 dark:border-purple-500/30",
        outline:
          "border-border text-foreground bg-transparent",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px] font-medium",
        default: "px-2.5 py-1 text-xs font-semibold",
        lg: "px-3 py-1.5 text-sm font-semibold",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  pulseDot?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Badge({
  className,
  variant,
  size,
  dot = false,
  pulseDot = false,
  leftIcon,
  rightIcon,
  children,
  ...props
}: BadgeProps) {
  const getDotColor = () => {
    switch (variant) {
      case "success":
        return "bg-emerald-500"
      case "warning":
        return "bg-amber-500"
      case "destructive":
        return "bg-rose-500"
      case "info":
        return "bg-sky-500"
      case "purple":
        return "bg-purple-500"
      case "default":
        return "bg-primary-foreground"
      default:
        return "bg-muted-foreground"
    }
  }

  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "inline-block rounded-full shrink-0",
            size === "sm" ? "size-1.5" : "size-2",
            getDotColor(),
            pulseDot && "status-pulse-dot"
          )}
          aria-hidden="true"
        />
      )}
      {leftIcon && <span className="shrink-0 [&>svg]:size-3.5">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="shrink-0 [&>svg]:size-3.5">{rightIcon}</span>}
    </span>
  )
}

export { badgeVariants }

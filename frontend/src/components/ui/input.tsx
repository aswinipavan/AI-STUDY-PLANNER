import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The one text input in the app. Radius and timing come from the `--app-*`
 * tokens; the focus ring comes from the global `:focus-visible` rule so inputs
 * inside CSS Modules match these exactly.
 *
 * `text-base` on small screens is deliberate — iOS Safari zooms the viewport
 * when a focused field is under 16px.
 */
const inputVariants = [
  "flex h-10 w-full rounded-[var(--app-radius-md)] border border-border bg-background px-3 py-2",
  "text-base md:text-sm text-foreground placeholder:text-muted-foreground",
  "transition-[color,background-color,border-color,box-shadow]",
  "duration-[var(--app-duration-fast)] ease-[var(--app-ease-out)]",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-destructive",
].join(" ")

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }

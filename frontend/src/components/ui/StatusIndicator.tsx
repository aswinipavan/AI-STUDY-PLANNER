import * as React from "react"
import {
  Clock,
  Zap,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Lock,
} from "lucide-react"
import { Badge, type BadgeProps } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

export type SessionCanonicalState =
  | "UPCOMING"
  | "ACTIVE"
  | "SUBMITTED"
  | "VERIFIED"
  | "COMPLETED"
  | "MISSED"
  | "CATCH_UP"
  | "LOCKED"
  | "FUTURE"

export interface StatusIndicatorProps {
  state: SessionCanonicalState
  label?: string
  subtext?: string
  showIcon?: boolean
  showDot?: boolean
  size?: "sm" | "default" | "lg"
  className?: string
}

const STATE_CONFIG: Record<
  SessionCanonicalState,
  {
    label: string
    variant: BadgeProps["variant"]
    icon: React.ComponentType<{ className?: string }>
    pulse?: boolean
  }
> = {
  UPCOMING: {
    label: "Upcoming",
    variant: "info",
    icon: Clock,
    pulse: false,
  },
  ACTIVE: {
    label: "Active Now",
    variant: "warning",
    icon: Zap,
    pulse: true,
  },
  SUBMITTED: {
    label: "Proof Submitted",
    variant: "purple",
    icon: UploadCloud,
    pulse: true,
  },
  VERIFIED: {
    label: "AI Verified",
    variant: "success",
    icon: Sparkles,
    pulse: false,
  },
  COMPLETED: {
    label: "Completed",
    variant: "success",
    icon: CheckCircle2,
    pulse: false,
  },
  MISSED: {
    label: "Missed",
    variant: "destructive",
    icon: AlertCircle,
    pulse: false,
  },
  CATCH_UP: {
    label: "Catch-Up Today",
    variant: "warning",
    icon: RotateCcw,
    pulse: false,
  },
  LOCKED: {
    label: "Locked",
    variant: "neutral",
    icon: Lock,
    pulse: false,
  },
  FUTURE: {
    label: "Locked",
    variant: "neutral",
    icon: Lock,
    pulse: false,
  },
}

export function StatusIndicator({
  state,
  label,
  subtext,
  showIcon = true,
  showDot = false,
  size = "default",
  className,
}: StatusIndicatorProps) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.UPCOMING
  const IconComponent = config.icon
  const displayLabel = label || config.label

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge
        variant={config.variant}
        size={size}
        dot={showDot}
        pulseDot={config.pulse && showDot}
        leftIcon={showIcon ? <IconComponent className="size-3.5" /> : undefined}
      >
        <span>{displayLabel}</span>
      </Badge>
      {subtext && (
        <span className="text-xs text-muted-foreground font-normal tabular-nums">
          {subtext}
        </span>
      )}
    </div>
  )
}

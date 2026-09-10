import * as React from "react"
import { Check, Clock, Zap, UploadCloud, Sparkles, CheckCircle2, Lock } from "lucide-react"
import type { SessionCanonicalState } from "@/components/ui/StatusIndicator"
import styles from "./sessionProgressionStepper.module.css"

export interface SessionProgressionStepperProps {
  canonicalState: SessionCanonicalState
  hasEvidenceSubmitted?: boolean
  isVerified?: boolean
  isCompleted?: boolean
  className?: string
}

interface StepDef {
  id: number
  title: string
  icon: React.ComponentType<{ className?: string }>
}

const STEPS: StepDef[] = [
  { id: 1, title: "Upcoming", icon: Clock },
  { id: 2, title: "Active Now", icon: Zap },
  { id: 3, title: "Submitted", icon: UploadCloud },
  { id: 4, title: "AI Verified", icon: Sparkles },
  { id: 5, title: "Completed", icon: CheckCircle2 },
]

export function SessionProgressionStepper({
  canonicalState,
  hasEvidenceSubmitted = false,
  isVerified = false,
  isCompleted = false,
}: SessionProgressionStepperProps) {
  // If the session is future/locked, show a simplified locked view
  if (canonicalState === "LOCKED" || canonicalState === "FUTURE") {
    return (
      <div className={styles.stepperContainer}>
        <div className={styles.headerRow}>
          <span className={styles.titleText}>Session Flow</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <Lock className="size-3" /> Locked until scheduled date
          </span>
        </div>
      </div>
    )
  }

  // Determine current active step (1-indexed)
  let currentStep = 1
  if (isCompleted) {
    currentStep = 5
  } else if (isVerified) {
    currentStep = 4
  } else if (hasEvidenceSubmitted || canonicalState === "SUBMITTED") {
    currentStep = 3
  } else if (canonicalState === "ACTIVE" || canonicalState === "CATCH_UP") {
    currentStep = 2
  } else if (canonicalState === "MISSED") {
    currentStep = 2
  } else {
    currentStep = 1
  }

  return (
    <div className={styles.stepperContainer}>
      <div className={styles.headerRow}>
        <span className={styles.titleText}>Verification Progression</span>
        <span className={styles.stepCountText}>
          {isCompleted ? "5 of 5 Completed" : `Step ${currentStep} of 5`}
        </span>
      </div>

      <div className={styles.stepsRow}>
        {STEPS.map((step) => {
          const isDone = currentStep > step.id || isCompleted
          const isCurrent = currentStep === step.id && !isCompleted
          const StepIcon = step.icon

          return (
            <div key={step.id} className={styles.stepItem}>
              <div
                className={`${styles.iconCircle} ${
                  isDone
                    ? styles.iconCircleCompleted
                    : isCurrent
                    ? styles.iconCircleCurrent
                    : ""
                }`}
                aria-label={`Step ${step.id}: ${step.title}`}
              >
                {isDone ? (
                  <Check className="size-3.5 stroke-[2.5]" />
                ) : (
                  <StepIcon className="size-3.5" />
                )}
              </div>
              <span
                className={`${styles.stepLabel} ${
                  isDone
                    ? styles.stepLabelCompleted
                    : isCurrent
                    ? styles.stepLabelCurrent
                    : ""
                }`}
              >
                {step.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

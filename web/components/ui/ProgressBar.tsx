import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Check } from "lucide-react";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

export interface ProgressStep {
  label: string;
  description?: string;
}

export interface ProgressBarProps {
  steps?: ProgressStep[];
  labels?: string[];
  totalSteps?: number;
  currentStep: number;
  className?: string;
}

export function ProgressBar({ steps, labels, currentStep, className }: ProgressBarProps) {
  const resolvedSteps: ProgressStep[] = steps || (labels ? labels.map((l) => ({ label: l })) : [
    { label: 'MFA OTP' },
    { label: 'Face Liveness' },
    { label: 'Cast Ballot' },
    { label: 'Confirmed' },
  ]);
  const zeroIndexedStep = currentStep > 0 && currentStep <= resolvedSteps.length ? currentStep - 1 : currentStep;

  return (
    <nav aria-label="Voting progress" className={cn("w-full", className)}>
      <ol className="flex items-start">
        {resolvedSteps.map((step, idx) => {
          const isCompleted = idx < zeroIndexedStep;
          const isActive = idx === zeroIndexedStep;
          const isUpcoming = idx > zeroIndexedStep;
          const isLast = idx === resolvedSteps.length - 1;

          return (
            <li key={step.label} className="flex flex-1 flex-col items-center last:flex-none">
              {/* Step dot + connector line */}
              <div className="flex items-center w-full">
                {/* Left connector */}
                {idx > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-all duration-300",
                      isCompleted ? "bg-blue-500" : "bg-slate-700"
                    )}
                  />
                )}

                {/* Step indicator */}
                <div
                  className={cn(
                    "relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-blue-600 border-blue-500 text-white"
                      : isActive
                      ? "bg-slate-900 border-blue-500 text-blue-400 ring-2 ring-blue-500/30"
                      : "bg-slate-900 border-slate-600 text-slate-500"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Right connector */}
                {!isLast && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-all duration-300",
                      isCompleted ? "bg-blue-500" : "bg-slate-700"
                    )}
                  />
                )}
              </div>

              {/* Step label */}
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-xs font-medium transition-colors duration-200",
                    isActive
                      ? "text-blue-300"
                      : isCompleted
                      ? "text-slate-300"
                      : "text-slate-500"
                  )}
                >
                  {step.label}
                </p>
                {step.description && isActive && (
                  <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Simple horizontal percentage bar (for vote tallies, risk scores, etc.) */
export function SimpleProgressBar({
  value,
  max = 100,
  label,
  colorClass = "bg-blue-500",
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  colorClass?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">{label}</span>
          <span className="font-medium text-slate-300">{pct}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", colorClass)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

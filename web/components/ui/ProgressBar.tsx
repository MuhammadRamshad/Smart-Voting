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
    { label: 'Login' },
    { label: 'Face' },
    { label: 'Ballot' },
    { label: 'Done' },
  ]);
  const zeroIndexedStep = currentStep > 0 && currentStep <= resolvedSteps.length ? currentStep - 1 : currentStep;

  return (
    <nav aria-label="Voting progress" className={cn("w-full", className)}>
      <ol className="flex items-start">
        {resolvedSteps.map((step, idx) => {
          const isCompleted = idx < zeroIndexedStep;
          const isActive = idx === zeroIndexedStep;
          const isLast = idx === resolvedSteps.length - 1;

          return (
            <li key={step.label} className="flex flex-1 flex-col items-center last:flex-none">
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div
                    className={cn(
                      "h-px flex-1 transition-all duration-300",
                      isCompleted ? "bg-white" : "bg-neutral-800"
                    )}
                  />
                )}

                <div
                  className={cn(
                    "relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                    isCompleted
                      ? "bg-white border-white text-black"
                      : isActive
                      ? "bg-black border-white text-white"
                      : "bg-black border-neutral-700 text-neutral-600"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5 text-black" />
                  ) : (
                    <span className="text-[10px] font-bold font-mono">{idx + 1}</span>
                  )}
                </div>

                {!isLast && (
                  <div
                    className={cn(
                      "h-px flex-1 transition-all duration-300",
                      isCompleted ? "bg-white" : "bg-neutral-800"
                    )}
                  />
                )}
              </div>

              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-[10px] font-mono transition-colors duration-200 uppercase tracking-wider",
                    isActive
                      ? "text-white"
                      : isCompleted
                      ? "text-neutral-400"
                      : "text-neutral-700"
                  )}
                >
                  {step.label}
                </p>
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
  colorClass = "bg-white",
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
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-neutral-500">{label}</span>
          <span className="font-medium text-neutral-300">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-neutral-900 overflow-hidden">
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

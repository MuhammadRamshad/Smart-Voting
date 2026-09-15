import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  xs: "h-3 w-3 border-[1.5px]",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
  xl: "h-12 w-12 border-4",
};

export function Spinner({ size = "md", className, label = "Loading..." }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <span
        className={cn(
          "animate-spin rounded-full border-slate-600 border-t-blue-400",
          sizeStyles[size]
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

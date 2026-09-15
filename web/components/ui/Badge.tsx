import { HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "default";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success:
    "bg-green-900/40 text-green-300 border-green-700/50",
  warning:
    "bg-amber-900/40 text-amber-300 border-amber-700/50",
  danger:
    "bg-red-900/40 text-red-300 border-red-700/50",
  info:
    "bg-blue-900/40 text-blue-300 border-blue-700/50",
  default:
    "bg-slate-800/60 text-slate-300 border-slate-700/50",
};

export function Badge({
  variant = "default",
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

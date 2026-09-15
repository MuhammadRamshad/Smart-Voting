import { HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  noPadding?: boolean;
}

export function Card({
  header,
  footer,
  noPadding = false,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-xl backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {header && (
        <div className="border-b border-slate-700/50 px-6 py-4">{header}</div>
      )}
      <div className={cn(!noPadding && "p-6")}>{children}</div>
      {footer && (
        <div className="border-t border-slate-700/50 px-6 py-4">{footer}</div>
      )}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-lg font-semibold text-slate-100", className)}>
      {children}
    </h2>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-1 text-sm text-slate-400", className)}>{children}</p>
  );
}

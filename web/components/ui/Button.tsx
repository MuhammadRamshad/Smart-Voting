import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white shadow-lg shadow-blue-900/30 border border-blue-600/50",
  secondary:
    "bg-violet-700 hover:bg-violet-600 active:bg-violet-800 text-white shadow-lg shadow-violet-900/30 border border-violet-600/50",
  danger:
    "bg-red-700 hover:bg-red-600 active:bg-red-800 text-white shadow-lg shadow-red-900/30 border border-red-600/50",
  ghost:
    "bg-transparent hover:bg-slate-700/50 active:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700 hover:border-slate-600",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-5 text-sm gap-2 rounded-xl",
  lg: "h-12 px-7 text-base gap-2.5 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          variant === "primary" && "focus:ring-blue-500",
          variant === "secondary" && "focus:ring-violet-500",
          variant === "danger" && "focus:ring-red-500",
          variant === "ghost" && "focus:ring-slate-500",
          fullWidth && "w-full",
          !isDisabled && "hover:scale-[1.02] active:scale-[0.98]",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
        ) : (
          leftIcon && (
            <span className="flex-shrink-0">{leftIcon}</span>
          )
        )}
        {children}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

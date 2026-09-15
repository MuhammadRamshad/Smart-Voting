"use client";

import { useEffect, useRef, ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Prevent closing when clicking the backdrop */
  persistent?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  persistent = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !persistent) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, persistent]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current && !persistent) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl animate-slide-up",
          className
        )}
      >
        {/* Header */}
        {(title || !persistent) && (
          <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
            {title && (
              <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            )}
            {!persistent && (
              <button
                onClick={onClose}
                className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

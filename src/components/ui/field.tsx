"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px]",
        "text-[var(--color-text)] placeholder:text-[var(--color-text-faint)]",
        "transition-colors focus:border-[var(--color-g-blue)]/60 focus:bg-white/[0.05] focus:outline-none",
        "font-mono",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]",
        className
      )}
      {...props}
    />
  );
}

export function Hint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[11px] leading-relaxed text-[var(--color-text-faint)]", className)}
      {...props}
    />
  );
}

type ButtonVariant = "primary" | "ghost" | "danger";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-primary text-white shadow-glow-blue hover:brightness-110 active:brightness-95",
  ghost:
    "bg-white/[0.04] text-[var(--color-text-dim)] hover:bg-white/[0.07] hover:text-[var(--color-text)] border border-white/10",
  danger:
    "bg-white/[0.04] text-[var(--color-g-red)] hover:bg-[var(--color-g-red)]/10 border border-[var(--color-g-red)]/30",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  value: T;
  onValueChange: (v: T) => void;
  options: SelectOption<T>[];
  density?: "xs" | "sm";
}

export function NativeSelect<T extends string>({
  value,
  onValueChange,
  options,
  className,
  density = "xs",
  ...rest
}: Props<T>) {
  const padding = density === "xs" ? "py-[2px] pl-2 pr-6 text-[11px]" : "py-1 pl-2.5 pr-7 text-[12px]";
  return (
    <div className={cn("relative inline-block", className)}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value as T)}
        className={cn(
          "nodrag nopan nowheel appearance-none rounded-full border border-white/10 bg-white/[0.04] tracking-tight text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] focus:border-[var(--color-g-blue)]/60 focus:outline-none",
          padding
        )}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#16161F]">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--color-text-faint)]"
        strokeWidth={2}
      />
    </div>
  );
}

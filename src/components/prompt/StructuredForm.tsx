"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AspectRatio, GeminiImageModel } from "@/lib/canvas/types";

const STYLES = ["Cinematic", "Minimal", "Editorial", "Photographic", "Illustrative"] as const;
type Style = (typeof STYLES)[number];

const ASPECTS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
];

const MODEL_OPTS: { value: GeminiImageModel; label: string }[] = [
  { value: "gemini-3-pro-image-preview", label: "Nano Banana Pro" },
  { value: "gemini-2.5-flash-image", label: "Nano Banana" },
];

export interface StructuredValues {
  goal: string;
  style: Style | null;
  aspect: AspectRatio;
  model: GeminiImageModel;
  variants: number;
  constraints: string;
  refs: string[];
}

export const EMPTY_STRUCTURED: StructuredValues = {
  goal: "",
  style: null,
  aspect: "1:1",
  model: "gemini-3-pro-image-preview",
  variants: 1,
  constraints: "",
  refs: [],
};

export function StructuredForm({
  value,
  onChange,
  disabled,
}: {
  value: StructuredValues;
  onChange: (v: StructuredValues) => void;
  disabled?: boolean;
}) {
  const [showConstraints, setShowConstraints] = useState(!!value.constraints);
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = useCallback(
    (p: Partial<StructuredValues>) => onChange({ ...value, ...p }),
    [onChange, value]
  );

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const urls = await Promise.all(
      Array.from(files).slice(0, 14).map(fileToDataUrl)
    );
    patch({ refs: [...value.refs, ...urls].slice(0, 14) });
  };

  return (
    <div className={cn("w-full space-y-3.5 px-1 pb-1", disabled && "opacity-60")}>
      <FieldLabel>Goal</FieldLabel>
      <textarea
        value={value.goal}
        onChange={(e) => patch({ goal: e.target.value })}
        disabled={disabled}
        placeholder="E.g. Hero image for a Telekom router product page, evoking outdoor freedom."
        rows={2}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-g-blue)]/60 focus:bg-white/[0.05] focus:outline-none"
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel>Style</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {STYLES.map((s) => (
              <Chip
                key={s}
                active={value.style === s}
                onClick={() => patch({ style: value.style === s ? null : s })}
                disabled={disabled}
              >
                {s}
              </Chip>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Aspect</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {ASPECTS.map((a) => (
              <Chip
                key={a.value}
                active={value.aspect === a.value}
                onClick={() => patch({ aspect: a.value })}
                disabled={disabled}
              >
                {a.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel>Target model</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {MODEL_OPTS.map((m) => (
              <Chip
                key={m.value}
                active={value.model === m.value}
                onClick={() => patch({ model: m.value })}
                disabled={disabled}
              >
                {m.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Variants</FieldLabel>
          <Stepper
            value={value.variants}
            onChange={(v) => patch({ variants: v })}
            min={1}
            max={4}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>
          Reference images{" "}
          <span className="text-[var(--color-text-faint)] normal-case tracking-normal">
            (optional, up to 14)
          </span>
        </FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          {value.refs.map((url, i) => (
            <div key={i} className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`ref-${i}`} className="h-full w-full object-cover" />
              <button
                onClick={() => patch({ refs: value.refs.filter((_, j) => j !== i) })}
                disabled={disabled}
                className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl-md bg-black/60 text-white hover:bg-[var(--color-g-red)]"
                aria-label="Remove reference"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
          ))}
          {value.refs.length < 14 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={disabled}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/15 text-[var(--color-text-faint)] transition-colors hover:border-white/30 hover:text-[var(--color-text-dim)]"
              aria-label="Add reference"
            >
              <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onFiles(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      <button
        onClick={() => setShowConstraints((v) => !v)}
        disabled={disabled}
        className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)]"
      >
        {showConstraints ? "− Hide constraints" : "+ Additional constraints"}
      </button>
      {showConstraints && (
        <textarea
          value={value.constraints}
          onChange={(e) => patch({ constraints: e.target.value })}
          disabled={disabled}
          placeholder="Brand rules, do/don't, must include text, palette, etc."
          rows={2}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-g-blue)]/60 focus:bg-white/[0.05] focus:outline-none"
        />
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border px-2.5 py-[3px] text-[11px] tracking-tight transition-all",
        active
          ? "border-transparent bg-gradient-primary text-white shadow-glow-blue"
          : "border-white/10 bg-white/[0.03] text-[var(--color-text-dim)] hover:bg-white/[0.06] hover:text-[var(--color-text)]"
      )}
    >
      {children}
    </button>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.03]">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="flex h-7 w-7 items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-text)] disabled:opacity-40"
        aria-label="Decrease"
      >
        <Minus className="h-3 w-3" strokeWidth={2} />
      </button>
      <div className="w-7 text-center text-[12px] font-medium tabular-nums">{value}</div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="flex h-7 w-7 items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-text)] disabled:opacity-40"
        aria-label="Increase"
      >
        <Plus className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function buildStructuredPrompt(v: StructuredValues): string {
  const lines: string[] = [];
  lines.push(v.goal.trim() || "Generate a creative workflow.");
  if (v.style) lines.push(`Style: ${v.style}.`);
  lines.push(`Aspect ratio: ${v.aspect}.`);
  lines.push(
    `Target image model: ${v.model === "gemini-3-pro-image-preview" ? "Nano Banana Pro" : "Nano Banana"}.`
  );
  if (v.variants > 1) lines.push(`Produce ${v.variants} distinct image variations.`);
  if (v.refs.length)
    lines.push(
      `Use ${v.refs.length} reference image${v.refs.length === 1 ? "" : "s"} as style/identity guidance.`
    );
  if (v.constraints.trim()) lines.push(`Constraints: ${v.constraints.trim()}`);
  return lines.join("\n");
}

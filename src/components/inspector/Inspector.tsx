"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Play, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { useCanvasStore } from "@/lib/canvas/store";
import { executeNode } from "@/lib/executor/executeNode";
import { NativeSelect } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  AspectRatio,
  CanvasNode,
  ClaudeModel,
  GeminiImageModel,
  ImageGenNodeData,
  ImageRefNodeData,
  ImageResolution,
  OutputNodeData,
  PromptNodeData,
} from "@/lib/canvas/types";

const CLAUDE_MODELS: { value: ClaudeModel; label: string }[] = [
  { value: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { value: "claude-opus-4-7", label: "Opus 4.7" },
  { value: "claude-haiku-4-5", label: "Haiku 4.5" },
];

const GEMINI_MODELS: { value: GeminiImageModel; label: string }[] = [
  { value: "gemini-3-pro-image-preview", label: "Nano Banana Pro" },
  { value: "gemini-2.5-flash-image", label: "Nano Banana (Flash)" },
];

const ASPECTS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
];

const RESOLUTIONS: { value: ImageResolution; label: string }[] = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

export function Inspector() {
  const nodes = useCanvasStore((s) => s.nodes);
  const patch = useCanvasStore((s) => s.patchNodeData);
  const removeNode = useCanvasStore((s) => s.removeNode);

  const selected = useMemo(
    () => nodes.find((n) => n.selected) ?? null,
    [nodes]
  );

  return (
    <AnimatePresence>
      {selected && (
        <motion.aside
          key={selected.id}
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 24, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto absolute right-4 top-20 bottom-32 z-20 flex w-[340px] flex-col overflow-hidden rounded-3xl"
        >
          <div className="glass flex h-full flex-col overflow-hidden rounded-3xl">
            <Header node={selected} onDelete={() => removeNode(selected.id)} />
            <div className="nowheel nodrag flex-1 space-y-4 overflow-y-auto px-5 pb-5">
              <Body node={selected} onPatch={(p) => patch(selected.id, p)} />
            </div>
            <Footer node={selected} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Header({
  node,
  onDelete,
}: {
  node: CanvasNode;
  onDelete: () => void;
}) {
  const subtitle: Record<CanvasNode["data"]["kind"], string> = {
    prompt: "Text · Claude",
    imageGen: "Image · Gemini",
    imageRef: "Reference image",
    output: "Consolidated result",
  };
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 px-5 pb-3 pt-4">
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium tracking-tight">
          {node.data.label}
        </div>
        <div className="text-[11px] text-[var(--color-text-faint)]">
          {subtitle[node.data.kind]} · id {node.id}
        </div>
      </div>
      <button
        onClick={onDelete}
        aria-label="Delete node"
        className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[var(--color-text-faint)] transition-colors hover:bg-[var(--color-g-red)]/10 hover:text-[var(--color-g-red)]"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
}

function Body({
  node,
  onPatch,
}: {
  node: CanvasNode;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  switch (node.data.kind) {
    case "prompt":
      return <PromptBody data={node.data} onPatch={onPatch} />;
    case "imageGen":
      return <ImageGenBody data={node.data} onPatch={onPatch} />;
    case "imageRef":
      return <ImageRefBody data={node.data} onPatch={onPatch} />;
    case "output":
      return <OutputBody data={node.data} />;
  }
}

function PromptBody({
  data,
  onPatch,
}: {
  data: PromptNodeData;
  onPatch: (patch: Partial<PromptNodeData>) => void;
}) {
  const isOpus = data.model === "claude-opus-4-7";
  return (
    <div className="space-y-4 pt-4">
      <LabeledField label="Label">
        <TextInput
          value={data.label}
          onChange={(label) => onPatch({ label })}
        />
      </LabeledField>
      <LabeledField label="Model">
        <NativeSelect
          density="sm"
          value={data.model}
          onValueChange={(model) => onPatch({ model, cacheHit: false })}
          options={CLAUDE_MODELS}
        />
      </LabeledField>
      <LabeledField label="Prompt">
        <Textarea
          value={data.prompt}
          onChange={(prompt) => onPatch({ prompt, cacheHit: false })}
          rows={5}
        />
      </LabeledField>
      <LabeledField label="System prompt" hint="optional persona / constraints">
        <Textarea
          value={data.systemPrompt ?? ""}
          onChange={(systemPrompt) =>
            onPatch({ systemPrompt: systemPrompt || undefined, cacheHit: false })
          }
          rows={3}
        />
      </LabeledField>
      <LabeledField
        label={isOpus ? "Temperature (disabled for Opus 4.7)" : "Temperature"}
        hint={isOpus ? "Opus 4.7 ignores temperature." : `${data.temperature.toFixed(2)}`}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={data.temperature}
          onChange={(e) =>
            onPatch({ temperature: parseFloat(e.target.value), cacheHit: false })
          }
          disabled={isOpus}
          className="nodrag w-full accent-[var(--color-g-blue)] disabled:opacity-40"
        />
      </LabeledField>
      {data.output && (
        <LabeledField label="Last output">
          <div className="max-h-[200px] overflow-auto rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[12px] leading-snug text-[var(--color-text-dim)]">
            {data.output}
          </div>
        </LabeledField>
      )}
    </div>
  );
}

function ImageGenBody({
  data,
  onPatch,
}: {
  data: ImageGenNodeData;
  onPatch: (patch: Partial<ImageGenNodeData>) => void;
}) {
  return (
    <div className="space-y-4 pt-4">
      <LabeledField label="Label">
        <TextInput value={data.label} onChange={(label) => onPatch({ label })} />
      </LabeledField>
      <LabeledField label="Model">
        <NativeSelect
          density="sm"
          value={data.model}
          onValueChange={(model) => onPatch({ model, cacheHit: false })}
          options={GEMINI_MODELS}
        />
      </LabeledField>
      <LabeledField label="Prompt">
        <Textarea
          value={data.prompt}
          onChange={(prompt) => onPatch({ prompt, cacheHit: false })}
          rows={5}
        />
      </LabeledField>
      <LabeledField label="Aspect ratio">
        <ChipGroup
          options={ASPECTS}
          value={data.aspectRatio}
          onChange={(aspectRatio) => onPatch({ aspectRatio, cacheHit: false })}
        />
      </LabeledField>
      <LabeledField label="Resolution">
        <ChipGroup
          options={RESOLUTIONS}
          value={data.resolution}
          onChange={(resolution) => onPatch({ resolution, cacheHit: false })}
        />
      </LabeledField>
    </div>
  );
}

function ImageRefBody({
  data,
  onPatch,
}: {
  data: ImageRefNodeData;
  onPatch: (patch: Partial<ImageRefNodeData>) => void;
}) {
  const preview = data.dataUrl || data.url;
  const onFile = async (file: File) => {
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    onPatch({
      source: "upload",
      dataUrl: url,
      url: undefined,
    });
  };

  return (
    <div className="space-y-4 pt-4">
      <LabeledField label="Label">
        <TextInput value={data.label} onChange={(label) => onPatch({ label })} />
      </LabeledField>
      {preview && (
        <LabeledField label="Preview">
          <div className="relative overflow-hidden rounded-xl border border-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={data.label} className="h-auto w-full" />
            <button
              onClick={() => onPatch({ url: undefined, dataUrl: undefined })}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-[var(--color-g-red)]"
              aria-label="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </LabeledField>
      )}
      <LabeledField label="URL">
        <TextInput
          value={data.url ?? ""}
          onChange={(v) => onPatch({ source: "url", url: v || undefined, dataUrl: undefined })}
          placeholder="https://…"
        />
      </LabeledField>
      <LabeledField label="Upload">
        <label className="nodrag flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-3 text-[12px] text-[var(--color-text-dim)] transition-colors hover:border-white/30 hover:text-[var(--color-text)]">
          <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
          Choose file
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
            className="hidden"
          />
        </label>
      </LabeledField>
    </div>
  );
}

function OutputBody({ data }: { data: OutputNodeData }) {
  return (
    <div className="space-y-4 pt-4 text-[12px] text-[var(--color-text-dim)]">
      <p>
        Output nodes consolidate upstream text and images. Run the whole
        workflow (Run button, top right) to populate.
      </p>
      {data.text && (
        <div className="max-h-[200px] overflow-auto rounded-xl border border-white/5 bg-white/[0.02] p-3">
          {data.text}
        </div>
      )}
      {data.images?.length ? (
        <div className="grid grid-cols-2 gap-2">
          {data.images.map((src, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`out-${i}`} className="h-auto w-full" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Footer({ node }: { node: CanvasNode }) {
  const running = node.data.status === "running";
  const patch = useCanvasStore((s) => s.patchNodeData);
  const runnable = node.data.kind === "prompt" || node.data.kind === "imageGen";
  const resetCache = () => {
    patch(node.id, { cacheHit: false });
    if (node.data.kind === "prompt") patch(node.id, { output: undefined });
    if (node.data.kind === "imageGen") patch(node.id, { outputImage: undefined });
  };
  return (
    <div className="flex items-center gap-2 border-t border-white/5 px-5 py-3">
      <button
        onClick={resetCache}
        className="nodrag inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-[var(--color-text-dim)] transition-colors hover:bg-white/[0.07] hover:text-[var(--color-text)]"
      >
        <RotateCcw className="h-3 w-3" strokeWidth={2} />
        Reset cache
      </button>
      <div className="flex-1" />
      {runnable && (
        <button
          onClick={() => !running && void executeNode(node.id)}
          disabled={running}
          className={cn(
            "nodrag inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11.5px] font-medium text-white transition-all",
            running
              ? "bg-white/10 text-[var(--color-text-faint)]"
              : "bg-gradient-primary shadow-glow-blue hover:brightness-110 active:brightness-95"
          )}
        >
          {running ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.2} />
              Running
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current" strokeWidth={0} />
              Run node
            </>
          )}
        </button>
      )}
    </div>
  );
}

function LabeledField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
          {label}
        </div>
        {hint && (
          <div className="text-[10.5px] text-[var(--color-text-faint)]">{hint}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="nodrag w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-g-blue)]/60 focus:outline-none"
    />
  );
}

function Textarea({
  value,
  onChange,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows ?? 4}
      className="nodrag w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] leading-snug text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-g-blue)]/60 focus:outline-none"
    />
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "nodrag rounded-full border px-2.5 py-[3px] text-[11px] tracking-tight transition-all",
            value === o.value
              ? "border-transparent bg-gradient-primary text-white shadow-glow-blue"
              : "border-white/10 bg-white/[0.03] text-[var(--color-text-dim)] hover:bg-white/[0.07] hover:text-[var(--color-text)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

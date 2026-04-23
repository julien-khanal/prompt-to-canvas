"use client";

import { useMemo } from "react";
import { Ban, EyeOff, Loader2, Play, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { useCanvasStore } from "@/lib/canvas/store";
import { executeNode } from "@/lib/executor/executeNode";
import { NativeSelect } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  AspectRatio,
  CanvasNode,
  ClaudeModel,
  DisabledMode,
  ImageGenModel,
  ImageGenNodeData,
  ImageRefNodeData,
  ImageResolution,
  OutputNodeData,
  PromptNodeData,
  RefRole,
} from "@/lib/canvas/types";

const CLAUDE_MODELS: { value: ClaudeModel; label: string }[] = [
  { value: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { value: "claude-opus-4-7", label: "Opus 4.7" },
  { value: "claude-haiku-4-5", label: "Haiku 4.5" },
];

const IMAGE_MODELS: { value: ImageGenModel; label: string }[] = [
  { value: "gemini-3-pro-image-preview", label: "Nano Banana Pro" },
  { value: "gemini-2.5-flash-image", label: "Nano Banana (Flash)" },
  { value: "fal-flux-schnell", label: "Flux Schnell (fal)" },
  { value: "fal-flux-dev", label: "Flux Dev (fal)" },
  { value: "fal-flux-pro", label: "Flux Pro (fal)" },
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

const REF_ROLES: { value: RefRole; label: string }[] = [
  { value: "style", label: "Style" },
  { value: "subject", label: "Subject" },
  { value: "palette", label: "Palette" },
  { value: "composition", label: "Composition" },
  { value: "pose", label: "Pose" },
];

export function Inspector() {
  const nodes = useCanvasStore((s) => s.nodes);
  const patch = useCanvasStore((s) => s.patchNodeData);
  const removeNode = useCanvasStore((s) => s.removeNode);

  const selected = useMemo(
    () => nodes.find((n) => n.selected) ?? null,
    [nodes]
  );

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[12px] text-[var(--color-text-faint)]">
        Select a node on the canvas to inspect.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header node={selected} onDelete={() => removeNode(selected.id)} />
      <div className="nowheel nodrag flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        <Body node={selected} onPatch={(p) => patch(selected.id, p)} />
      </div>
      <Footer node={selected} />
    </div>
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
    imageGen: "Image · Gemini / Flux",
    imageRef: "Reference image",
    output: "Consolidated result",
    compare: "Slider compare",
    array: "Variants array",
    critic: "Critic · scores + retunes",
    styleAnchor: "Style anchor · brand library",
  };
  const patch = useCanvasStore((s) => s.patchNodeData);
  const pushHistory = useCanvasStore((s) => s.pushHistory);
  const setMode = (mode: DisabledMode) => {
    pushHistory(`Toggle ${mode}`);
    const next = node.data.disabled === mode ? undefined : mode;
    patch(node.id, { disabled: next });
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
      <div className="flex flex-none items-center gap-0.5">
        <ToolbarBtn
          active={node.data.disabled === "bypass"}
          onClick={() => setMode("bypass")}
          label="Bypass (⌘B)"
          accent="bypass"
        >
          <EyeOff className="h-3.5 w-3.5" strokeWidth={1.8} />
        </ToolbarBtn>
        <ToolbarBtn
          active={node.data.disabled === "mute"}
          onClick={() => setMode("mute")}
          label="Mute (⌘M)"
          accent="mute"
        >
          <Ban className="h-3.5 w-3.5" strokeWidth={1.8} />
        </ToolbarBtn>
        <ToolbarBtn onClick={onDelete} label="Delete" accent="danger">
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
        </ToolbarBtn>
      </div>
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  label,
  accent,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  accent: "bypass" | "mute" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
        active
          ? accent === "bypass"
            ? "bg-[var(--color-g-purple)]/25 text-[var(--color-g-purple)]"
            : "bg-[var(--color-g-red)]/20 text-[var(--color-g-red)]"
          : accent === "danger"
            ? "text-[var(--color-text-faint)] hover:bg-[var(--color-g-red)]/10 hover:text-[var(--color-g-red)]"
            : "text-[var(--color-text-faint)] hover:bg-white/[0.05] hover:text-[var(--color-text)]"
      )}
    >
      {children}
    </button>
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
    case "compare":
      return <CompareBody data={node.data} onPatch={onPatch} />;
    case "array":
      return <ArrayBody data={node.data} onPatch={onPatch} />;
    case "critic":
      return <CriticBody data={node.data} onPatch={onPatch} />;
    case "styleAnchor":
      return <StyleAnchorBody data={node.data} onPatch={onPatch} />;
  }
}

function StyleAnchorBody({
  data,
  onPatch,
}: {
  data: import("@/lib/canvas/types").StyleAnchorNodeData;
  onPatch: (patch: Partial<import("@/lib/canvas/types").StyleAnchorNodeData>) => void;
}) {
  const refs = data.references ?? [];

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = 14 - refs.length;
    if (remaining <= 0) return;
    const slice = Array.from(files).slice(0, remaining);
    const results = await Promise.all(
      slice.map(
        (f) =>
          new Promise<{ dataUrl: string; label: string }>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve({ dataUrl: r.result as string, label: f.name });
            r.onerror = reject;
            r.readAsDataURL(f);
          })
      )
    );
    onPatch({ references: [...refs, ...results].slice(0, 14) });
  };

  const removeAt = (i: number) => {
    onPatch({ references: refs.filter((_, j) => j !== i) });
  };

  const onDistill = async () => {
    if (refs.length === 0) return;
    onPatch({ status: "running", error: undefined });
    try {
      const apiKey =
        (await (await import("@/lib/crypto/keyring")).getKey("anthropic")) ?? "";
      // Compress oversize uploads before hitting Anthropic's 5 MB-per-image cap.
      const { downscaleManyForClaude } = await import("@/lib/util/downscaleForClaude");
      const compressed = await downscaleManyForClaude(refs.map((r) => r.dataUrl));
      const res = await fetch("/api/claude/distill-style", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey,
          images: compressed,
          existingDistillate: data.distillate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "distill failed");
      onPatch({ distillate: json.distillate, status: "done" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onPatch({ status: "error", error: msg });
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <LabeledField label="Label">
        <TextInput value={data.label} onChange={(label) => onPatch({ label })} />
      </LabeledField>

      <LabeledField label={`References (${refs.length}/14)`} hint="3–14 work best">
        {refs.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {refs.map((r, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.dataUrl} alt={r.label ?? `ref-${i}`} className="h-full w-full object-cover" />
                <button
                  onClick={() => removeAt(i)}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-[var(--color-g-red)]"
                  aria-label="Remove"
                >
                  <X className="h-2.5 w-2.5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {refs.length < 14 && (
          <label className="nodrag mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-2.5 text-[12px] text-[var(--color-text-dim)] transition-colors hover:border-white/30 hover:text-[var(--color-text)]">
            <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
            Add images ({14 - refs.length} left)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onFiles(e.target.files)}
              className="hidden"
            />
          </label>
        )}
      </LabeledField>

      <LabeledField
        label="Style distillate"
        hint={data.distillate ? "Used as text guidance alongside refs" : "Optional — Claude can write one"}
      >
        <Textarea
          value={data.distillate ?? ""}
          onChange={(distillate) => onPatch({ distillate: distillate || undefined })}
          rows={5}
        />
        <button
          onClick={onDistill}
          disabled={refs.length === 0 || data.status === "running"}
          className="nodrag mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-secondary px-3 py-1.5 text-[11px] font-medium text-white shadow-glow-blue transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {data.status === "running" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
              Distilling…
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current" strokeWidth={0} />
              {data.distillate ? "Re-distill with Claude" : "Distill style with Claude"}
            </>
          )}
        </button>
      </LabeledField>

      <p className="text-[11px] leading-relaxed text-[var(--color-text-faint)]">
        Wire this node into any ImageGen node&apos;s input. All references are passed as style refs to Gemini, plus the distillate is appended to the prompt as guidance. One node, one wire — replaces 5–14 individual ImageRef connections.
      </p>
    </div>
  );
}

function CriticBody({
  data,
  onPatch,
}: {
  data: import("@/lib/canvas/types").CriticNodeData;
  onPatch: (patch: Partial<import("@/lib/canvas/types").CriticNodeData>) => void;
}) {
  return (
    <div className="space-y-4 pt-4">
      <LabeledField label="Label">
        <TextInput value={data.label} onChange={(label) => onPatch({ label })} />
      </LabeledField>
      <LabeledField label="Judge model">
        <NativeSelect
          density="sm"
          value={data.model}
          onValueChange={(model) => onPatch({ model })}
          options={CLAUDE_MODELS}
        />
      </LabeledField>
      <LabeledField label="Criteria" hint="What makes a good output?">
        <Textarea
          value={data.criteria}
          onChange={(criteria) => onPatch({ criteria })}
          rows={5}
        />
      </LabeledField>
      <LabeledField label="Threshold" hint={`≥ ${data.threshold}/10 = passing`}>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={data.threshold}
          onChange={(e) => onPatch({ threshold: parseInt(e.target.value, 10) })}
          className="nodrag w-full accent-[var(--color-g-blue)]"
        />
      </LabeledField>
      <LabeledField label="Max iterations" hint="1-5">
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={data.maxIterations}
          onChange={(e) => onPatch({ maxIterations: parseInt(e.target.value, 10) })}
          className="nodrag w-full accent-[var(--color-g-blue)]"
        />
        <div className="text-[11px] text-[var(--color-text-faint)]">{data.maxIterations}</div>
      </LabeledField>
      {typeof data.lastScore === "number" && (
        <LabeledField label="Last result">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[14px] text-[var(--color-text)]">
                {data.lastScore.toFixed(1)} / 10
              </span>
              <span className="text-[10.5px] uppercase tracking-wider text-[var(--color-text-faint)]">
                iteration {data.iterations ?? 0}
              </span>
            </div>
            {data.lastFeedback && (
              <div className="text-[12px] leading-snug text-[var(--color-text-dim)]">
                {data.lastFeedback}
              </div>
            )}
            {data.lastSuggestion && (
              <details className="text-[11.5px] text-[var(--color-text-faint)]">
                <summary className="cursor-pointer hover:text-[var(--color-text-dim)]">
                  Suggested prompt
                </summary>
                <div className="mt-1.5 rounded-lg bg-black/30 p-2 font-mono text-[11px] text-[var(--color-text-dim)] whitespace-pre-wrap">
                  {data.lastSuggestion}
                </div>
              </details>
            )}
          </div>
        </LabeledField>
      )}
      <p className="text-[11px] leading-relaxed text-[var(--color-text-faint)]">
        Wire one upstream Prompt or Image node into this Critic. On Run, it scores the
        upstream output against your criteria. If below threshold, it rewrites the upstream
        prompt and retries — up to <em>Max iterations</em> times.
      </p>
    </div>
  );
}

function ArrayBody({
  data,
  onPatch,
}: {
  data: import("@/lib/canvas/types").ArrayNodeData;
  onPatch: (patch: Partial<import("@/lib/canvas/types").ArrayNodeData>) => void;
}) {
  return (
    <div className="space-y-4 pt-4">
      <LabeledField label="Label">
        <TextInput value={data.label} onChange={(label) => onPatch({ label })} />
      </LabeledField>
      <p className="text-[11.5px] leading-relaxed text-[var(--color-text-faint)]">
        Edit items inline on the node. When this Array is connected to an
        Image node&apos;s input, the Image node runs once per non-empty item
        — each item is appended as &quot;Variant focus&quot; to its base prompt.
        Cache works per-variant so reruns are cheap.
      </p>
      <p className="text-[11.5px] leading-relaxed text-[var(--color-text-faint)]">
        Currently {data.items.filter((s) => s.trim()).length} non-empty item{data.items.filter((s) => s.trim()).length === 1 ? "" : "s"}.
      </p>
    </div>
  );
}

function CompareBody({
  data,
  onPatch,
}: {
  data: import("@/lib/canvas/types").CompareNodeData;
  onPatch: (patch: Partial<import("@/lib/canvas/types").CompareNodeData>) => void;
}) {
  return (
    <div className="space-y-4 pt-4">
      <LabeledField label="Label">
        <TextInput value={data.label} onChange={(label) => onPatch({ label })} />
      </LabeledField>
      <LabeledField label="Split position" hint={`${Math.round(data.splitPercent ?? 50)}%`}>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={data.splitPercent ?? 50}
          onChange={(e) => onPatch({ splitPercent: parseInt(e.target.value, 10) })}
          className="nodrag w-full accent-[var(--color-g-blue)]"
        />
      </LabeledField>
      <p className="text-[11.5px] text-[var(--color-text-faint)] leading-relaxed">
        Wire two image sources into the left handles. Drag the slider on the canvas to compare. The compare node has no execution — it&apos;s purely a viewer.
      </p>
    </div>
  );
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
  const onOverrideFile = async (file: File) => {
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    onPatch({
      outputImage: url,
      outputOverride: true,
      status: "done",
      cacheHit: true,
    });
  };

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
          options={IMAGE_MODELS}
        />
      </LabeledField>
      {data.model.startsWith("fal-flux-") && (
        <>
          <LabeledField
            label="LoRA URL"
            hint="Optional · paste the .safetensors URL from fal.ai or Hugging Face"
          >
            <TextInput
              value={data.loraUrl ?? ""}
              onChange={(v) => onPatch({ loraUrl: v || undefined, cacheHit: false })}
              placeholder="https://…/my-style.safetensors"
            />
          </LabeledField>
          {data.loraUrl && (
            <LabeledField label="LoRA strength" hint={`${(data.loraStrength ?? 1).toFixed(2)}`}>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={data.loraStrength ?? 1}
                onChange={(e) =>
                  onPatch({
                    loraStrength: parseFloat(e.target.value),
                    cacheHit: false,
                  })
                }
                className="nodrag w-full accent-[var(--color-g-blue)]"
              />
            </LabeledField>
          )}
        </>
      )}
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
      <LabeledField
        label="Output image"
        hint={
          data.outputOverride
            ? "manual override · runs are skipped"
            : data.outputImage
              ? "override the generated result"
              : "empty — run or override"
        }
      >
        {data.outputImage ? (
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-xl border border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.outputImage} alt="output" className="h-auto w-full" />
              <button
                onClick={() => onPatch({ outputImage: undefined, outputOverride: false, status: "idle", cacheHit: false })}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-[var(--color-g-red)]"
                aria-label="Clear output"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <label className="nodrag flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-[11.5px] text-[var(--color-text-dim)] transition-colors hover:border-white/30 hover:text-[var(--color-text)]">
              <Upload className="h-3 w-3" strokeWidth={2} />
              Replace with own image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onOverrideFile(f);
                }}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <label className="nodrag flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-3 text-[12px] text-[var(--color-text-dim)] transition-colors hover:border-white/30 hover:text-[var(--color-text)]">
            <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
            Upload to skip generation
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onOverrideFile(f);
              }}
              className="hidden"
            />
          </label>
        )}
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
      <LabeledField
        label="Role"
        hint="How downstream image nodes should use this ref"
      >
        <ChipGroup
          options={REF_ROLES}
          value={data.role ?? "style"}
          onChange={(role) => onPatch({ role })}
        />
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
    const bump = (node.data as { cacheBust?: number }).cacheBust ?? 0;
    patch(node.id, { cacheHit: false, cacheBust: bump + 1 });
    if (node.data.kind === "prompt") patch(node.id, { output: undefined });
    if (node.data.kind === "imageGen")
      patch(node.id, {
        outputImage: undefined,
        outputImages: undefined,
        outputOverride: false,
      });
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

"use client";

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNode, NodeChip, NodeFieldRow } from "./BaseNode";
import { NativeSelect } from "@/components/ui/select";
import { useCanvasStore } from "@/lib/canvas/store";
import type {
  CanvasNode,
  ImageGenHistoryEntry,
  ImageGenModel,
  ImageGenNodeData,
} from "@/lib/canvas/types";

const MODEL_OPTIONS: { value: ImageGenModel; label: string }[] = [
  { value: "gemini-3-pro-image-preview", label: "Nano Banana Pro" },
  { value: "gemini-2.5-flash-image", label: "Nano Banana" },
  { value: "fal-flux-schnell", label: "Flux Schnell (fal)" },
  { value: "fal-flux-dev", label: "Flux Dev (fal)" },
  { value: "fal-flux-pro", label: "Flux Pro (fal)" },
];

/**
 * Format a relative time like "2m" / "5h" / "3d", or "now" if very recent.
 * Used as the hover tooltip on history thumbnails.
 */
function relativeTime(ts: number): string {
  const dt = Date.now() - ts;
  if (dt < 30_000) return "now";
  const m = Math.round(dt / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export function ImageGenNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const d = data as ImageGenNodeData;
  const patch = useCanvasStore((s) => s.patchNodeData);

  // Compose the gallery list: current outputImage first, then any history
  // entries that aren't the current one. De-duped by dataUrl. Capped at 6
  // visible entries (1 active + up to 5 historical) to keep the node small.
  const gallery: { dataUrl: string; ts: number; isActive: boolean }[] = [];
  const seen = new Set<string>();
  if (d.outputImage) {
    gallery.push({ dataUrl: d.outputImage, ts: Date.now(), isActive: true });
    seen.add(d.outputImage);
  }
  for (const entry of d.outputHistory ?? []) {
    if (seen.has(entry.dataUrl)) continue;
    gallery.push({ ...entry, isActive: false });
    seen.add(entry.dataUrl);
    if (gallery.length >= 6) break;
  }
  const showVariantGrid = !!d.outputImages && d.outputImages.length > 1;
  const showGallery = !showVariantGrid && gallery.length > 1;

  const swapToHistory = (entry: ImageGenHistoryEntry) => {
    // Move the chosen entry to active. Push the previously-active back into
    // history so the swap is reversible (round-trip preserves all bytes).
    const prevActive = d.outputImage;
    const newHistory: ImageGenHistoryEntry[] = [];
    if (prevActive && prevActive !== entry.dataUrl) {
      newHistory.push({ dataUrl: prevActive, ts: Date.now() });
    }
    for (const e of d.outputHistory ?? []) {
      if (e.dataUrl === entry.dataUrl) continue;
      if (e.dataUrl === prevActive) continue;
      newHistory.push(e);
    }
    patch<ImageGenNodeData>(id, {
      outputImage: entry.dataUrl,
      outputHistory: newHistory.slice(0, 5),
      outputOverride: true,
    });
  };

  return (
    <BaseNode
      id={id}
      title={d.label}
      subtitle="Image · Gemini"
      status={d.status}
      accent="primary"
      cacheHit={d.cacheHit}
      selected={selected}
      width={312}
      runnable
      error={d.error}
      disabled={d.disabled}
    >
      <NodeFieldRow label="Model">
        <NativeSelect
          value={d.model}
          onValueChange={(v) =>
            patch<ImageGenNodeData>(id, { model: v, cacheHit: false })
          }
          options={MODEL_OPTIONS}
        />
      </NodeFieldRow>
      {d.loraUrl && (
        <NodeFieldRow label="LoRA">
          <span className="truncate font-mono text-[10.5px]">
            {d.loraUrl.split("/").slice(-1)[0]?.slice(0, 18) ?? "set"}
            {d.loraStrength !== undefined && ` · ${d.loraStrength.toFixed(2)}`}
          </span>
        </NodeFieldRow>
      )}
      <div className="flex items-center gap-1.5">
        <NodeChip>{d.aspectRatio}</NodeChip>
        <NodeChip>{d.resolution}</NodeChip>
        {d.outputOverride && (
          <NodeChip>
            <span title="Showing a manually-selected historical render. Re-running will replace it.">
              picked
            </span>
          </NodeChip>
        )}
      </div>
      <div className="rounded-lg bg-white/[0.03] p-2.5 text-[12px] leading-snug text-[var(--color-text-dim)] line-clamp-3">
        {d.prompt || "—"}
      </div>
      {d.variantProgress && (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-[var(--color-text-dim)]">
          Variants: {d.variantProgress.done} / {d.variantProgress.total}
        </div>
      )}
      {showVariantGrid && d.outputImages ? (
        <div className="grid grid-cols-2 gap-1.5">
          {d.outputImages.map((src, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`variant-${i + 1}`} className="h-auto w-full" />
            </div>
          ))}
        </div>
      ) : d.outputImage ? (
        <div className="space-y-1.5">
          <div className="overflow-hidden rounded-lg border border-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.outputImage} alt={d.label} className="h-auto w-full" />
          </div>
          {showGallery && (
            <ImageGenHistoryStrip
              gallery={gallery}
              activeUrl={d.outputImage}
              onPick={swapToHistory}
            />
          )}
        </div>
      ) : (
        <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[11px] text-[var(--color-text-faint)]">
          preview renders after run
        </div>
      )}
    </BaseNode>
  );
}

function ImageGenHistoryStrip({
  gallery,
  activeUrl,
  onPick,
}: {
  gallery: { dataUrl: string; ts: number; isActive: boolean }[];
  activeUrl: string;
  onPick: (entry: ImageGenHistoryEntry) => void;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-[var(--color-text-faint)]">
        <span>Versions</span>
        <span className="tabular-nums">{gallery.length}</span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {gallery.map((g, i) => {
          const isActive = g.dataUrl === activeUrl;
          const labelTitle = isActive
            ? "Current render"
            : `Previous render (${relativeTime(g.ts)} ago) — click to use`;
          return (
            <button
              key={g.dataUrl.slice(0, 32) + i}
              type="button"
              title={labelTitle}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => {
                if (!isActive) onPick({ dataUrl: g.dataUrl, ts: g.ts });
              }}
              className={[
                "relative shrink-0 overflow-hidden rounded-md border transition",
                "h-12 w-16",
                isActive
                  ? "border-[var(--color-accent-primary)] ring-1 ring-[var(--color-accent-primary)]/40"
                  : "border-white/10 opacity-70 hover:opacity-100 hover:border-white/30",
                hoverIdx === i ? "scale-[1.04]" : "",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.dataUrl}
                alt={isActive ? "current" : `version ${i}`}
                className="h-full w-full object-cover"
                draggable={false}
              />
              {isActive && (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[8.5px] font-medium uppercase tracking-wider text-white/90">
                  now
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import type { NodeProps } from "@xyflow/react";
import { BaseNode, NodeChip, NodeFieldRow } from "./BaseNode";
import { NativeSelect } from "@/components/ui/select";
import { useCanvasStore } from "@/lib/canvas/store";
import type {
  CanvasNode,
  GeminiImageModel,
  ImageGenNodeData,
} from "@/lib/canvas/types";

const MODEL_OPTIONS: { value: GeminiImageModel; label: string }[] = [
  { value: "gemini-3-pro-image-preview", label: "Nano Banana Pro" },
  { value: "gemini-2.5-flash-image", label: "Nano Banana" },
];

export function ImageGenNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const d = data as ImageGenNodeData;
  const patch = useCanvasStore((s) => s.patchNodeData);
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
      <div className="flex items-center gap-1.5">
        <NodeChip>{d.aspectRatio}</NodeChip>
        <NodeChip>{d.resolution}</NodeChip>
      </div>
      <div className="rounded-lg bg-white/[0.03] p-2.5 text-[12px] leading-snug text-[var(--color-text-dim)] line-clamp-3">
        {d.prompt || "—"}
      </div>
      {d.variantProgress && (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-[var(--color-text-dim)]">
          Variants: {d.variantProgress.done} / {d.variantProgress.total}
        </div>
      )}
      {d.outputImages && d.outputImages.length > 1 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {d.outputImages.map((src, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`variant-${i + 1}`} className="h-auto w-full" />
            </div>
          ))}
        </div>
      ) : d.outputImage ? (
        <div className="overflow-hidden rounded-lg border border-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.outputImage} alt={d.label} className="h-auto w-full" />
        </div>
      ) : (
        <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[11px] text-[var(--color-text-faint)]">
          preview renders after run
        </div>
      )}
    </BaseNode>
  );
}

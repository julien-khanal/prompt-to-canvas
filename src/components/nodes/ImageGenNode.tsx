"use client";

import type { NodeProps } from "@xyflow/react";
import { BaseNode, NodeChip, NodeFieldRow } from "./BaseNode";
import type { CanvasNode, ImageGenNodeData } from "@/lib/canvas/types";

export function ImageGenNode({ data, selected }: NodeProps<CanvasNode>) {
  const d = data as ImageGenNodeData;
  return (
    <BaseNode
      title={d.label}
      subtitle="Image · Gemini"
      status={d.status}
      accent="primary"
      cacheHit={d.cacheHit}
      selected={selected}
      width={312}
    >
      <NodeFieldRow label="Model">
        {d.model === "gemini-3-pro-image-preview" ? "Nano Banana Pro" : "Nano Banana"}
      </NodeFieldRow>
      <div className="flex items-center gap-1.5">
        <NodeChip>{d.aspectRatio}</NodeChip>
        <NodeChip>{d.resolution}</NodeChip>
      </div>
      <div className="rounded-lg bg-white/[0.03] p-2.5 text-[12px] leading-snug text-[var(--color-text-dim)] line-clamp-3">
        {d.prompt || "—"}
      </div>
      {d.outputImage ? (
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

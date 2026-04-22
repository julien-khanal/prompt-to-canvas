"use client";

import type { NodeProps } from "@xyflow/react";
import { ImageIcon } from "lucide-react";
import { BaseNode, NodeFieldRow } from "./BaseNode";
import type { CanvasNode, ImageRefNodeData } from "@/lib/canvas/types";

export function ImageRefNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const d = data as ImageRefNodeData;
  void id;
  const preview = d.dataUrl || d.url;
  return (
    <BaseNode
      title={d.label}
      subtitle="Reference"
      status={d.status}
      accent="primary"
      cacheHit={d.cacheHit}
      selected={selected}
      showInputHandle={false}
    >
      {preview ? (
        <div className="overflow-hidden rounded-lg border border-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={d.label} className="h-auto w-full" />
        </div>
      ) : (
        <div className="flex h-[96px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[11px] text-[var(--color-text-faint)]">
          <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
          drop image or paste URL
        </div>
      )}
      <NodeFieldRow label="Role">{d.role ?? "style"}</NodeFieldRow>
      <NodeFieldRow label="Source">{d.source}</NodeFieldRow>
      {d.width && d.height && (
        <NodeFieldRow label="Dim">{`${d.width}×${d.height}`}</NodeFieldRow>
      )}
    </BaseNode>
  );
}

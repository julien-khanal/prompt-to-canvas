"use client";

import type { NodeProps } from "@xyflow/react";
import { BaseNode, NodeFieldRow } from "./BaseNode";
import type { CanvasNode, PromptNodeData } from "@/lib/canvas/types";

export function PromptNode({ data, selected }: NodeProps<CanvasNode>) {
  const d = data as PromptNodeData;
  return (
    <BaseNode
      title={d.label}
      subtitle="Text · Claude"
      status={d.status}
      accent="secondary"
      cacheHit={d.cacheHit}
      selected={selected}
    >
      <NodeFieldRow label="Model">{d.model}</NodeFieldRow>
      <NodeFieldRow label="Temp">{d.temperature.toFixed(2)}</NodeFieldRow>
      <div className="rounded-lg bg-white/[0.03] p-2.5 text-[12px] leading-snug text-[var(--color-text-dim)] line-clamp-3">
        {d.prompt || "—"}
      </div>
      {d.output && (
        <div className="max-h-[180px] overflow-auto rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-[12px] leading-snug text-[var(--color-text)]">
          {d.output}
        </div>
      )}
    </BaseNode>
  );
}

"use client";

import type { NodeProps } from "@xyflow/react";
import { BaseNode, NodeFieldRow } from "./BaseNode";
import { NativeSelect } from "@/components/ui/select";
import { useCanvasStore } from "@/lib/canvas/store";
import type { CanvasNode, ClaudeModel, PromptNodeData } from "@/lib/canvas/types";

const MODEL_OPTIONS: { value: ClaudeModel; label: string }[] = [
  { value: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { value: "claude-opus-4-7", label: "Opus 4.7" },
  { value: "claude-haiku-4-5", label: "Haiku 4.5" },
];

export function PromptNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const d = data as PromptNodeData;
  const patch = useCanvasStore((s) => s.patchNodeData);
  return (
    <BaseNode
      id={id}
      title={d.label}
      subtitle="Text · Claude"
      status={d.status}
      accent="secondary"
      cacheHit={d.cacheHit}
      selected={selected}
      runnable
      error={d.error}
    >
      <NodeFieldRow label="Model">
        <NativeSelect
          value={d.model}
          onValueChange={(v) =>
            patch<PromptNodeData>(id, { model: v, cacheHit: false })
          }
          options={MODEL_OPTIONS}
        />
      </NodeFieldRow>
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

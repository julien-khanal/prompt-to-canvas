"use client";

import type { NodeProps } from "@xyflow/react";
import { BaseNode, NodeFieldRow } from "./BaseNode";
import { NativeSelect } from "@/components/ui/select";
import { useCanvasStore } from "@/lib/canvas/store";
import type { CanvasNode, ClaudeModel, CriticNodeData } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

const MODELS: { value: ClaudeModel; label: string }[] = [
  { value: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { value: "claude-opus-4-7", label: "Opus 4.7" },
  { value: "claude-haiku-4-5", label: "Haiku 4.5" },
];

export function CriticNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const d = data as CriticNodeData;
  const patch = useCanvasStore((s) => s.patchNodeData);
  return (
    <BaseNode
      id={id}
      title={d.label}
      subtitle="Critic · scores + retunes upstream"
      status={d.status}
      accent="success"
      selected={selected}
      runnable
      error={d.error}
      disabled={d.disabled}
      width={304}
      showOutputHandle={false}
    >
      <NodeFieldRow label="Judge model">
        <NativeSelect
          value={d.model}
          onValueChange={(v) => patch<CriticNodeData>(id, { model: v })}
          options={MODELS}
        />
      </NodeFieldRow>
      <NodeFieldRow label="Threshold">{`≥ ${d.threshold}/10`}</NodeFieldRow>
      <NodeFieldRow label="Max iter.">{d.maxIterations}</NodeFieldRow>
      <div className="rounded-lg bg-white/[0.03] p-2.5 text-[12px] leading-snug text-[var(--color-text-dim)] line-clamp-3">
        {d.criteria || "—"}
      </div>
      {typeof d.lastScore === "number" && (
        <ScoreBox score={d.lastScore} threshold={d.threshold} iter={d.iterations ?? 0} />
      )}
      {d.lastFeedback && (
        <div className="max-h-[120px] overflow-auto rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-[11.5px] leading-snug text-[var(--color-text-dim)]">
          {d.lastFeedback}
        </div>
      )}
    </BaseNode>
  );
}

function ScoreBox({
  score,
  threshold,
  iter,
}: {
  score: number;
  threshold: number;
  iter: number;
}) {
  const passed = score >= threshold;
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11.5px]",
        passed
          ? "border-[var(--color-g-green)]/30 bg-[var(--color-g-green)]/10"
          : "border-white/10 bg-white/[0.03]"
      )}
    >
      <span
        className={cn(
          "font-mono font-medium",
          passed ? "text-[var(--color-g-green)]" : "text-[var(--color-text)]"
        )}
      >
        {score.toFixed(1)} / 10
      </span>
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-faint)]">
        iter {iter}
      </span>
    </div>
  );
}

"use client";

import type { NodeProps } from "@xyflow/react";
import { Layers } from "lucide-react";
import { BaseNode, NodeFieldRow } from "./BaseNode";
import type { CanvasNode, StyleAnchorNodeData } from "@/lib/canvas/types";

export function StyleAnchorNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const d = data as StyleAnchorNodeData;
  const refs = d.references ?? [];
  return (
    <BaseNode
      id={id}
      title={d.label}
      subtitle={`Style anchor · ${refs.length} ref${refs.length === 1 ? "" : "s"}`}
      status={d.status}
      accent="primary"
      selected={selected}
      width={304}
      showInputHandle={false}
      disabled={d.disabled}
    >
      <NodeFieldRow label="References">{refs.length} / 14</NodeFieldRow>
      {refs.length === 0 ? (
        <div className="flex h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 text-center text-[11px] text-[var(--color-text-faint)]">
          <Layers className="mb-1 h-4 w-4" strokeWidth={1.5} />
          Add 5–14 reference images via Inspector
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {refs.slice(0, 12).map((r, i) => (
            <div key={i} className="aspect-square overflow-hidden rounded border border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.dataUrl} alt={r.label ?? `ref-${i}`} className="h-full w-full object-cover" />
            </div>
          ))}
          {refs.length > 12 && (
            <div className="flex aspect-square items-center justify-center rounded border border-white/5 bg-white/[0.04] text-[10.5px] text-[var(--color-text-dim)]">
              +{refs.length - 12}
            </div>
          )}
        </div>
      )}
      {d.distillate && (
        <div className="rounded-lg bg-white/[0.03] p-2.5 text-[11.5px] leading-snug text-[var(--color-text-dim)] line-clamp-3">
          <span className="text-[var(--color-text-faint)] uppercase tracking-wider text-[9.5px]">distillate · </span>
          {d.distillate}
        </div>
      )}
    </BaseNode>
  );
}

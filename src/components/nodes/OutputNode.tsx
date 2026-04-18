"use client";

import type { NodeProps } from "@xyflow/react";
import { Download } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { CanvasNode, OutputNodeData } from "@/lib/canvas/types";

export function OutputNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const d = data as OutputNodeData;
  void id;
  const hasAny = !!(d.text || (d.images && d.images.length));
  return (
    <BaseNode
      title={d.label}
      subtitle="Final"
      status={d.status}
      accent="success"
      selected={selected}
      showOutputHandle={false}
      width={320}
      footer={
        hasAny ? (
          <button className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]">
            <Download className="h-3 w-3" /> Export
          </button>
        ) : null
      }
    >
      {!hasAny && (
        <div className="flex h-[110px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[11px] text-[var(--color-text-faint)]">
          consolidated result
        </div>
      )}
      {d.text && (
        <div className="max-h-[180px] overflow-auto rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-[12px] leading-snug">
          {d.text}
        </div>
      )}
      {d.images?.map((src, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`output-${i}`} className="h-auto w-full" />
        </div>
      ))}
    </BaseNode>
  );
}

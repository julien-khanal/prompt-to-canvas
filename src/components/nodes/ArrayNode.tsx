"use client";

import type { NodeProps } from "@xyflow/react";
import { List } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useCanvasStore } from "@/lib/canvas/store";
import type { ArrayNodeData, CanvasNode } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

export function ArrayNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const d = data as ArrayNodeData;
  const patch = useCanvasStore((s) => s.patchNodeData);

  const updateItem = (i: number, value: string) => {
    const next = [...d.items];
    next[i] = value;
    patch<ArrayNodeData>(id, { items: next });
  };
  const removeItem = (i: number) =>
    patch<ArrayNodeData>(id, { items: d.items.filter((_, j) => j !== i) });
  const addItem = () =>
    patch<ArrayNodeData>(id, { items: [...d.items, ""] });

  return (
    <BaseNode
      id={id}
      title={d.label}
      subtitle={`Array · ${d.items.length} item${d.items.length === 1 ? "" : "s"}`}
      status={d.status}
      accent="primary"
      selected={selected}
      width={280}
      showInputHandle={false}
      disabled={d.disabled}
    >
      <div className="space-y-1.5">
        {d.items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/[0.05] text-[10px] text-[var(--color-text-faint)]">
              {i + 1}
            </div>
            <input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder="Variant value…"
              className="nodrag nopan flex-1 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1 text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-g-blue)]/60 focus:outline-none"
            />
            <button
              onClick={() => removeItem(i)}
              className="nodrag flex h-5 w-5 flex-none items-center justify-center rounded-full text-[var(--color-text-faint)] transition-colors hover:bg-[var(--color-g-red)]/10 hover:text-[var(--color-g-red)]"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addItem}
          className={cn(
            "nodrag inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-white/10 bg-white/[0.02] py-1 text-[11px] text-[var(--color-text-faint)] transition-colors",
            "hover:border-white/20 hover:bg-white/[0.04] hover:text-[var(--color-text-dim)]"
          )}
        >
          <List className="h-3 w-3" strokeWidth={2} />
          Add item
        </button>
      </div>
    </BaseNode>
  );
}

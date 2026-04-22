"use client";

import { FileText, Gauge, GitCompareArrows, Image as ImageIcon, Images, Flag, List } from "lucide-react";
import type { CanvasNodeData } from "@/lib/canvas/types";

type Kind = CanvasNodeData["kind"];

export const TOOLBOX_MIME = "application/x-prompt-canvas-node";

const ITEMS: { kind: Kind; label: string; Icon: typeof FileText }[] = [
  { kind: "prompt", label: "Prompt", Icon: FileText },
  { kind: "imageGen", label: "Image", Icon: ImageIcon },
  { kind: "imageRef", label: "Reference", Icon: Images },
  { kind: "array", label: "Variants array", Icon: List },
  { kind: "compare", label: "Compare A/B", Icon: GitCompareArrows },
  { kind: "critic", label: "Critic / goal-seek", Icon: Gauge },
  { kind: "output", label: "Output", Icon: Flag },
];

export function Toolbox() {
  return (
    <div className="glass pointer-events-auto absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5 rounded-2xl p-1.5">
      {ITEMS.map(({ kind, label, Icon }) => (
        <button
          key={kind}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(TOOLBOX_MIME, kind);
            e.dataTransfer.effectAllowed = "copy";
          }}
          title={`Drag to canvas · ${label}`}
          aria-label={`Add ${label} node`}
          className="group flex h-10 w-10 cursor-grab items-center justify-center rounded-xl text-[var(--color-text-faint)] transition-colors hover:bg-white/[0.06] hover:text-[var(--color-text)] active:cursor-grabbing"
        >
          <Icon className="h-4 w-4" strokeWidth={1.7} />
        </button>
      ))}
      <div className="mx-auto mt-1 h-[1px] w-6 bg-white/10" />
      <div className="pb-1 pt-0.5 text-center text-[8.5px] uppercase tracking-widest text-[var(--color-text-faint)]">
        drag
      </div>
    </div>
  );
}

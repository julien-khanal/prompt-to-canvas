"use client";

import { useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { GitCompareArrows, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import type { CanvasNode, CompareNodeData } from "@/lib/canvas/types";

export function CompareNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const d = data as CompareNodeData;
  const patch = useCanvasStore((s) => s.patchNodeData);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  useEffect(() => {
    const incoming = edges.filter((e) => e.target === id);
    const sources = incoming.map((e) => nodes.find((n) => n.id === e.source)).filter(Boolean) as CanvasNode[];
    const images: string[] = [];
    for (const src of sources) {
      if (src.data.kind === "imageGen" && src.data.outputImage) images.push(src.data.outputImage);
      else if (src.data.kind === "imageRef") {
        const url = src.data.dataUrl ?? src.data.url;
        if (url) images.push(url);
      }
    }
    const left = images[0];
    const right = images[1];
    if (left !== d.leftImage || right !== d.rightImage) {
      patch<CompareNodeData>(id, { leftImage: left, rightImage: right });
    }
  }, [edges, nodes, id, patch, d.leftImage, d.rightImage]);

  const split = d.splitPercent ?? 50;
  const setSplit = (v: number) =>
    patch<CompareNodeData>(id, { splitPercent: Math.max(0, Math.min(100, v)) });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: 360 }}
      className={cn(
        "glass relative overflow-hidden rounded-2xl text-[var(--color-text)] transition-all",
        "shadow-[0_12px_40px_-18px_rgba(0,0,0,0.6)]",
        selected ? "ring-2 ring-[var(--color-g-blue)]/60 shadow-glow-blue" : "ring-0",
        d.disabled === "mute" && "opacity-40 grayscale",
        d.disabled === "bypass" && "opacity-65"
      )}
    >
      <div className="h-[3px] w-full bg-gradient-secondary" aria-hidden />

      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gradient-secondary">
            <GitCompareArrows className="h-3 w-3 text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium leading-tight tracking-tight">
              {d.label}
            </div>
            <div className="truncate text-[11px] leading-tight text-[var(--color-text-faint)]">
              Slider compare · A/B
            </div>
          </div>
        </div>
        <Sparkles className="h-3.5 w-3.5 text-[var(--color-text-faint)]" strokeWidth={1.6} />
      </div>

      <div className="px-4 pb-3">
        {d.leftImage && d.rightImage ? (
          <SliderCompare left={d.leftImage} right={d.rightImage} split={split} onSplit={setSplit} />
        ) : (
          <div className="flex h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 text-[11px] text-[var(--color-text-faint)]">
            Connect two image sources to compare.
            <span className="mt-1 text-[10px]">{d.leftImage ? "Right input missing" : d.rightImage ? "Left input missing" : "Both missing"}</span>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ top: "55%" }}
        className="!h-3 !w-3 !border-2 !border-[#0A0A0F] !bg-[var(--color-g-blue)]"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="right"
        style={{ top: "75%" }}
        className="!h-3 !w-3 !border-2 !border-[#0A0A0F] !bg-[var(--color-g-coral)]"
      />
    </motion.div>
  );
}

function SliderCompare({
  left,
  right,
  split,
  onSplit,
}: {
  left: string;
  right: string;
  split: number;
  onSplit: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    const move = (clientX: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      onSplit(pct);
    };
    const onMove = (e: MouseEvent) => move(e.clientX);
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) move(e.touches[0].clientX);
    };
    const stop = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", onTouch);
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", stop);
    };
  }, [dragging, onSplit]);

  return (
    <div
      ref={ref}
      className="nodrag nopan relative w-full select-none overflow-hidden rounded-lg border border-white/5"
      style={{ aspectRatio: "16/10" }}
      onMouseDown={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        onSplit(pct);
        setDragging(true);
      }}
      onTouchStart={(e) => {
        if (!e.touches[0]) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const pct = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
        onSplit(pct);
        setDragging(true);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={left} alt="left" className="absolute inset-0 h-full w-full object-cover" />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${split}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={right}
          alt="right"
          className="absolute inset-0 h-full object-cover"
          style={{ width: ref.current?.clientWidth ?? "100%" }}
        />
      </div>
      <div
        className="absolute inset-y-0 z-[2] w-[2px] cursor-ew-resize bg-white/80"
        style={{ left: `calc(${split}% - 1px)` }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/60 text-white shadow-lg">
          <GitCompareArrows className="h-3.5 w-3.5" strokeWidth={2} />
        </div>
      </div>
      <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-[2px] text-[9px] uppercase tracking-widest text-white">
        right
      </div>
      <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-[2px] text-[9px] uppercase tracking-widest text-white">
        left
      </div>
    </div>
  );
}

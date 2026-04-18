"use client";

import { Handle, Position } from "@xyflow/react";
import { Loader2, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeStatus } from "@/lib/canvas/types";
import { executeNode } from "@/lib/executor/executeNode";

interface BaseNodeProps {
  id?: string;
  title: string;
  subtitle?: string;
  status: NodeStatus;
  accent?: "primary" | "secondary" | "success";
  children?: React.ReactNode;
  footer?: React.ReactNode;
  showInputHandle?: boolean;
  showOutputHandle?: boolean;
  cacheHit?: boolean;
  selected?: boolean;
  width?: number;
  runnable?: boolean;
  error?: string;
}

const ACCENT_CLASS: Record<NonNullable<BaseNodeProps["accent"]>, string> = {
  primary: "bg-gradient-primary",
  secondary: "bg-gradient-secondary",
  success: "bg-gradient-success",
};

export function BaseNode({
  id,
  title,
  subtitle,
  status,
  accent = "primary",
  children,
  footer,
  showInputHandle = true,
  showOutputHandle = true,
  cacheHit,
  selected,
  width = 288,
  runnable,
  error,
}: BaseNodeProps) {
  return (
    <div
      style={{ width }}
      className={cn(
        "glass group relative overflow-hidden rounded-2xl text-[var(--color-text)] transition-all",
        "shadow-[0_12px_40px_-18px_rgba(0,0,0,0.6)]",
        selected
          ? "ring-2 ring-[var(--color-g-blue)]/60 shadow-glow-blue"
          : "ring-0"
      )}
    >
      <div className={cn("h-[3px] w-full", ACCENT_CLASS[accent])} aria-hidden />

      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "flex h-6 w-6 flex-none items-center justify-center rounded-full",
              ACCENT_CLASS[accent]
            )}
          >
            <Sparkles className="h-3 w-3 text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium leading-tight tracking-tight">
              {title}
            </div>
            {subtitle && (
              <div className="truncate text-[11px] leading-tight text-[var(--color-text-faint)]">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        <StatusDot status={status} cacheHit={cacheHit} />
      </div>

      {children && <div className="px-4 pb-3 space-y-2.5 text-[12px]">{children}</div>}

      {error && (
        <div className="mx-4 mb-3 rounded-lg border border-[var(--color-g-red)]/30 bg-[var(--color-g-red)]/10 px-2.5 py-1.5 text-[11px] text-[var(--color-g-red)]">
          {error}
        </div>
      )}

      {(footer || (runnable && id)) && (
        <div className="flex items-center justify-between gap-2 border-t border-white/5 px-4 py-2.5">
          <div className="flex-1 min-w-0">{footer}</div>
          {runnable && id && <RunButton nodeId={id} status={status} />}
        </div>
      )}

      {showInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-[#0A0A0F] !bg-[var(--color-g-blue)]"
        />
      )}
      {showOutputHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-[#0A0A0F] !bg-[var(--color-g-coral)]"
        />
      )}
    </div>
  );
}

function StatusDot({ status, cacheHit }: { status: NodeStatus; cacheHit?: boolean }) {
  const base =
    "relative h-2.5 w-2.5 rounded-full flex-none transition-colors";
  const byStatus: Record<NodeStatus, string> = {
    idle: "bg-white/15",
    running: "bg-gradient-primary",
    done: "bg-gradient-success",
    error: "bg-[var(--color-g-red)]",
  };
  return (
    <div className="flex items-center gap-1.5">
      {cacheHit && (
        <span className="rounded-full bg-white/5 px-1.5 py-[1px] text-[9px] uppercase tracking-wider text-[var(--color-text-faint)]">
          cache
        </span>
      )}
      <span className={cn(base, byStatus[status])}>
        {status === "running" && (
          <span className="absolute inset-0 animate-ping rounded-full bg-gradient-primary opacity-60" />
        )}
      </span>
    </div>
  );
}

export function NodeFieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10.5px] uppercase tracking-wider text-[var(--color-text-faint)]">
        {label}
      </span>
      <span className="truncate text-[12px] text-[var(--color-text-dim)]">{children}</span>
    </div>
  );
}

function RunButton({ nodeId, status }: { nodeId: string; status: NodeStatus }) {
  const running = status === "running";
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!running) void executeNode(nodeId);
      }}
      disabled={running}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all",
        running
          ? "bg-white/[0.06] text-[var(--color-text-faint)]"
          : "bg-gradient-primary text-white hover:brightness-110 active:brightness-95 shadow-glow-blue"
      )}
      aria-label="Run node"
    >
      {running ? (
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
      ) : (
        <Play className="h-3 w-3 fill-current" strokeWidth={0} />
      )}
      {running ? "Running" : "Run"}
    </button>
  );
}

export function NodeChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-[2px] text-[10.5px] tracking-wide text-[var(--color-text-dim)]">
      {children}
    </span>
  );
}

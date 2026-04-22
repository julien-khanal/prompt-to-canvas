"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, FolderOpen, Pencil, Plug, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  createWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  listWorkflows,
  loadWorkflow,
  renameWorkflow,
  setLastOpened,
  type WorkflowSummary,
} from "@/lib/db/workflows";
import { useCanvasStore } from "@/lib/canvas/store";
import { McpExportDialog } from "./McpExportDialog";

export function DashboardModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [items, setItems] = useState<WorkflowSummary[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mcpExportId, setMcpExportId] = useState<string | null>(null);
  const currentId = useCanvasStore((s) => s.workflowId);
  const setWorkflow = useCanvasStore((s) => s.setWorkflow);

  const refresh = useCallback(async () => {
    setItems(await listWorkflows());
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const open_ = async (id: string) => {
    const wf = await loadWorkflow(id);
    if (!wf) return;
    await setLastOpened(id);
    setWorkflow(id, wf.name, wf.nodes, wf.edges);
    onOpenChange(false);
  };

  const onNew = async () => {
    const fresh = await createWorkflow();
    await setLastOpened(fresh.id);
    setWorkflow(fresh.id, fresh.name, [], []);
    onOpenChange(false);
  };

  const onDelete = async (id: string) => {
    await deleteWorkflow(id);
    if (id === currentId) {
      const remaining = await listWorkflows();
      if (remaining.length) {
        const next = remaining[0];
        const wf = await loadWorkflow(next.id);
        if (wf) {
          await setLastOpened(next.id);
          setWorkflow(next.id, wf.name, wf.nodes, wf.edges);
        }
      } else {
        const fresh = await createWorkflow();
        await setLastOpened(fresh.id);
        setWorkflow(fresh.id, fresh.name, [], []);
      }
    }
    await refresh();
  };

  const onDuplicate = async (id: string) => {
    await duplicateWorkflow(id);
    await refresh();
  };

  const onStartRename = (it: WorkflowSummary) => {
    setRenamingId(it.id);
    setRenameValue(it.name);
  };

  const onCommitRename = async () => {
    if (renamingId) {
      await renameWorkflow(renamingId, renameValue);
      if (renamingId === currentId) {
        useCanvasStore.getState().setWorkflowName(renameValue.trim() || renameValue);
      }
    }
    setRenamingId(null);
    await refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <span className="text-gradient-primary">Workflows</span>
          </DialogTitle>
          <DialogDescription>
            Everything saves automatically. Open one to continue, or start a new canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="nowheel max-h-[360px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[12px] text-[var(--color-text-faint)]">
              No workflows yet. Create one to get started.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map((it) => (
                <li
                  key={it.id}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
                    it.id === currentId
                      ? "border-[var(--color-g-blue)]/40 bg-white/[0.05]"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-primary shadow-glow-blue">
                    <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {renamingId === it.id ? (
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={onCommitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void onCommitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        autoFocus
                        className="w-full rounded-lg bg-white/[0.04] px-2 py-1 text-[13px] text-[var(--color-text)] focus:outline-none"
                      />
                    ) : (
                      <>
                        <div className="truncate text-[13px] font-medium">{it.name}</div>
                        <div className="truncate text-[11px] text-[var(--color-text-faint)]">
                          {it.nodeCount} nodes · {it.edgeCount} edges ·{" "}
                          {new Date(it.updatedAt).toLocaleString()}
                          {it.id === currentId && " · current"}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconBtn label="Export as MCP tool" onClick={() => setMcpExportId(it.id)}>
                      <Plug className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </IconBtn>
                    <IconBtn label="Rename" onClick={() => onStartRename(it)}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </IconBtn>
                    <IconBtn label="Duplicate" onClick={() => onDuplicate(it.id)}>
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </IconBtn>
                    <IconBtn label="Delete" onClick={() => onDelete(it.id)} danger>
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </IconBtn>
                    <IconBtn label="Open" onClick={() => open_(it.id)} accent>
                      <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </IconBtn>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onNew}>
            <Plus className="h-3 w-3" strokeWidth={2.4} />
            New workflow
          </Button>
        </div>
      </DialogContent>
      <McpExportDialog
        open={!!mcpExportId}
        onOpenChange={(v) => !v && setMcpExportId(null)}
        workflowId={mcpExportId}
      />
    </Dialog>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  danger,
  accent,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
        danger
          ? "text-[var(--color-text-faint)] hover:bg-[var(--color-g-red)]/10 hover:text-[var(--color-g-red)]"
          : accent
            ? "text-[var(--color-text-dim)] hover:bg-white/[0.07] hover:text-[var(--color-g-blue)]"
            : "text-[var(--color-text-faint)] hover:bg-white/[0.05] hover:text-[var(--color-text)]"
      )}
    >
      {children}
    </button>
  );
}

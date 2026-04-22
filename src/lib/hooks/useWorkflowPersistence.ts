"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/lib/canvas/store";
import {
  createWorkflow,
  getLastOpened,
  loadWorkflow,
  saveWorkflow,
  setLastOpened,
} from "@/lib/db/workflows";

const AUTOSAVE_DEBOUNCE_MS = 1500;

export function useWorkflowPersistence() {
  const hydrated = useCanvasStore((s) => s.hydrated);
  const setHydrated = useCanvasStore((s) => s.setHydrated);
  const setWorkflow = useCanvasStore((s) => s.setWorkflow);
  const workflowId = useCanvasStore((s) => s.workflowId);
  const workflowName = useCanvasStore((s) => s.workflowName);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const activeSkillIds = useCanvasStore((s) => s.activeSkillIds);
  const isRunning = useCanvasStore((s) => s.isRunning);
  const lastSavedSig = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hydrated) return;
    (async () => {
      const last = await getLastOpened();
      if (last) {
        const wf = await loadWorkflow(last);
        if (wf) {
          setWorkflow(last, wf.name, wf.nodes, wf.edges, wf.activeSkillIds);
          setHydrated(true);
          return;
        }
      }
      const fresh = await createWorkflow();
      await setLastOpened(fresh.id);
      setWorkflow(fresh.id, fresh.name, [], [], []);
      setHydrated(true);
    })();
  }, [hydrated, setHydrated, setWorkflow]);

  useEffect(() => {
    if (!hydrated || !workflowId) return;
    if (workflowId === "__transient__") return;
    if (isRunning) return;
    const sig = `${workflowName}::${nodes.length}::${edges.length}::${activeSkillIds.join(",")}::${JSON.stringify(nodes)}::${JSON.stringify(edges)}`;
    if (sig === lastSavedSig.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      lastSavedSig.current = sig;
      await saveWorkflow(workflowId, workflowName, nodes, edges, activeSkillIds);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, workflowId, workflowName, nodes, edges, activeSkillIds, isRunning]);
}

"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/lib/canvas/store";
import {
  fetchPendingCommands,
  getCoworkSecret,
  postCommandResult,
  pushSnapshot,
} from "@/lib/cowork/clientApi";
import { buildBridgeSnapshot, dispatchCommand } from "@/lib/cowork/dispatcher";

const POLL_INTERVAL_MS = 2000;
const SNAPSHOT_DEBOUNCE_MS = 500;

export function useCoworkBridge() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const workflowId = useCanvasStore((s) => s.workflowId);
  const workflowName = useCanvasStore((s) => s.workflowName);
  const activeSkillIds = useCanvasStore((s) => s.activeSkillIds);
  const hydrated = useCanvasStore((s) => s.hydrated);

  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSig = useRef<string>("");

  useEffect(() => {
    if (!hydrated) return;
    if (!getCoworkSecret()) return;

    const sig = `${workflowId}::${workflowName}::${nodes.length}::${edges.length}::${JSON.stringify(activeSkillIds)}::${JSON.stringify(nodes.map((n) => [n.id, n.position, n.data]))}`;
    if (sig === lastSig.current) return;

    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(async () => {
      lastSig.current = sig;
      const snap = buildBridgeSnapshot(
        nodes,
        edges,
        workflowId,
        workflowName,
        activeSkillIds
      );
      await pushSnapshot(snap);
    }, SNAPSHOT_DEBOUNCE_MS);

    return () => {
      if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    };
  }, [hydrated, workflowId, workflowName, nodes, edges, activeSkillIds]);

  useEffect(() => {
    if (!hydrated) return;
    if (!getCoworkSecret()) return;

    let stopped = false;
    let inFlight = false;

    const tick = async () => {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        const cmds = await fetchPendingCommands();
        for (const cmd of cmds) {
          const out = await dispatchCommand(cmd);
          await postCommandResult(cmd.id, out.ok, out.result, out.error);
        }
      } finally {
        inFlight = false;
      }
    };

    const handle = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(handle);
    };
  }, [hydrated]);
}

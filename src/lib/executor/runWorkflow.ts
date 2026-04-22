"use client";

import { useCanvasStore } from "@/lib/canvas/store";
import { executeNode } from "./executeNode";
import type { CanvasEdge, CanvasNode } from "@/lib/canvas/types";

export interface GraphRunOutcome extends RunOutcome {
  finalNodes: CanvasNode[];
}

export interface RunOutcome {
  ok: boolean;
  skipped: string[];
  failed: string[];
}

export async function runWorkflow(): Promise<RunOutcome> {
  const store = useCanvasStore.getState();
  if (store.isRunning) return { ok: false, skipped: [], failed: [] };
  if (!store.nodes.length) return { ok: true, skipped: [], failed: [] };

  const controller = new AbortController();
  store.setRunAbortController(controller);
  store.setRunning(true);
  store.resetRunStatuses();

  const failed = new Set<string>();
  const skipped: string[] = [];

  try {
    const layers = topoLayers(
      useCanvasStore.getState().nodes,
      useCanvasStore.getState().edges
    );
    for (const layer of layers) {
      if (controller.signal.aborted) break;
      await Promise.all(
        layer.map((id) =>
          executeOne(id, failed).then((result) => {
            if (result === "skipped") skipped.push(id);
            else if (result === "failed") failed.add(id);
          })
        )
      );
    }
    return { ok: failed.size === 0 && !controller.signal.aborted, skipped, failed: [...failed] };
  } finally {
    useCanvasStore.getState().setRunning(false);
    useCanvasStore.getState().setRunAbortController(null);
  }
}

export function abortWorkflowRun(): void {
  const c = useCanvasStore.getState().runAbortController;
  c?.abort();
}

export async function runWorkflowOnGraph(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): Promise<GraphRunOutcome> {
  const store = useCanvasStore.getState();
  const prevNodes = store.nodes;
  const prevEdges = store.edges;
  const prevId = store.workflowId;
  const prevName = store.workflowName;
  const prevSkills = store.activeSkillIds;

  store.setWorkflow("__transient__", "transient", nodes, edges, prevSkills);
  try {
    const outcome = await runWorkflow();
    const finalNodes = useCanvasStore.getState().nodes;
    return { ...outcome, finalNodes };
  } finally {
    store.setWorkflow(prevId, prevName, prevNodes, prevEdges, prevSkills);
  }
}

type ExecResult = "done" | "failed" | "skipped";

async function executeOne(id: string, failed: Set<string>): Promise<ExecResult> {
  const state = useCanvasStore.getState();
  const incoming = state.edges.filter((e) => e.target === id);

  const upstreamFailed = incoming.some((e) => failed.has(e.source));
  if (upstreamFailed) {
    state.setNodeStatus(id, "error", "upstream failed");
    return "skipped";
  }

  const incomingIds = incoming.map((e) => e.id);
  state.setEdgesAnimated(incomingIds, true);

  try {
    const outcome = await executeNode(id);
    return outcome.ok ? "done" : "failed";
  } finally {
    useCanvasStore.getState().setEdgesAnimated(incomingIds, false);
  }
}

function topoLayers(nodes: CanvasNode[], edges: CanvasEdge[]): string[][] {
  const muted = collectMutedClosure(nodes, edges);
  const liveNodes = nodes.filter((n) => !muted.has(n.id));
  const liveEdges = edges.filter((e) => !muted.has(e.source) && !muted.has(e.target));

  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const n of liveNodes) {
    inDegree.set(n.id, 0);
    outgoing.set(n.id, []);
  }
  for (const e of liveEdges) {
    if (!inDegree.has(e.target) || !outgoing.has(e.source)) continue;
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    outgoing.get(e.source)!.push(e.target);
  }

  const layers: string[][] = [];
  let current = liveNodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const visited = new Set<string>();

  while (current.length) {
    layers.push(current);
    current.forEach((id) => visited.add(id));
    const next: string[] = [];
    for (const id of current) {
      for (const nxt of outgoing.get(id) ?? []) {
        const d = (inDegree.get(nxt) ?? 0) - 1;
        inDegree.set(nxt, d);
        if (d === 0 && !visited.has(nxt)) next.push(nxt);
      }
    }
    current = next;
  }

  const missing = liveNodes.filter((n) => !visited.has(n.id)).map((n) => n.id);
  if (missing.length) layers.push(missing);

  return layers;
}

function collectMutedClosure(nodes: CanvasNode[], edges: CanvasEdge[]): Set<string> {
  const seedMuted = nodes.filter((n) => n.data.disabled === "mute").map((n) => n.id);
  const muted = new Set<string>(seedMuted);
  if (!seedMuted.length) return muted;

  const queue = [...seedMuted];
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of edges) {
      if (e.source !== id) continue;
      if (muted.has(e.target)) continue;
      muted.add(e.target);
      queue.push(e.target);
    }
  }
  return muted;
}

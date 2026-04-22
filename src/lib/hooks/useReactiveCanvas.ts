"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/lib/canvas/store";
import { executeNode } from "@/lib/executor/executeNode";
import type { CanvasNode } from "@/lib/canvas/types";

const DEBOUNCE_MS = 1800;
const SPEND_WINDOW_MS = 60_000;

function inputSignature(node: CanvasNode): string {
  switch (node.data.kind) {
    case "prompt":
      return JSON.stringify({
        m: node.data.model,
        p: node.data.prompt,
        s: node.data.systemPrompt ?? "",
        t: node.data.temperature,
        d: node.data.disabled ?? null,
        b: node.data.cacheBust ?? 0,
      });
    case "imageGen":
      return JSON.stringify({
        m: node.data.model,
        p: node.data.prompt,
        a: node.data.aspectRatio,
        r: node.data.resolution,
        d: node.data.disabled ?? null,
        b: node.data.cacheBust ?? 0,
        o: node.data.outputOverride ?? false,
      });
    case "imageRef":
      return JSON.stringify({
        u: node.data.url ?? "",
        d: node.data.dataUrl ? "[data]" : "",
        r: node.data.role ?? "style",
        x: node.data.disabled ?? null,
      });
    case "array":
      return JSON.stringify({
        i: node.data.items,
        d: node.data.disabled ?? null,
      });
    default:
      return "";
  }
}

function downstreamRunnables(
  startId: string,
  nodes: CanvasNode[],
  edges: { source: string; target: string }[]
): string[] {
  const out = new Set<string>();
  const queue = [startId];
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const e of edges) {
      if (e.source !== id) continue;
      const target = nodes.find((n) => n.id === e.target);
      if (!target) continue;
      if (target.data.kind === "prompt" || target.data.kind === "imageGen") {
        out.add(target.id);
      }
      queue.push(target.id);
    }
  }
  return [...out];
}

export function useReactiveCanvas() {
  const reactiveMode = useCanvasStore((s) => s.reactiveMode);
  const isRunning = useCanvasStore((s) => s.isRunning);

  const lastSig = useRef<Map<string, string>>(new Map());
  const pending = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const recentSpends = useRef<Array<{ at: number; cost: number }>>([]);

  useEffect(() => {
    if (!reactiveMode) {
      pending.current.forEach((t) => clearTimeout(t));
      pending.current.clear();
      lastSig.current.clear();
      return;
    }

    const unsub = useCanvasStore.subscribe((state, prevState) => {
      if (state.isRunning) return;
      if (state.nodes === prevState.nodes) return;

      const tickWindow = () => {
        const cutoff = Date.now() - SPEND_WINDOW_MS;
        recentSpends.current = recentSpends.current.filter((r) => r.at >= cutoff);
        const spent = recentSpends.current.reduce((a, b) => a + b.cost, 0);
        useCanvasStore.setState({ reactiveSpentLastMin: spent });
        return spent;
      };

      const changed: string[] = [];
      for (const n of state.nodes) {
        const sig = inputSignature(n);
        const prev = lastSig.current.get(n.id);
        if (prev === undefined) {
          lastSig.current.set(n.id, sig);
          continue;
        }
        if (prev !== sig) {
          lastSig.current.set(n.id, sig);
          if (n.data.kind === "prompt" || n.data.kind === "imageGen") {
            changed.push(n.id);
          } else if (n.data.kind === "imageRef" || n.data.kind === "array") {
            const downstream = downstreamRunnables(n.id, state.nodes, state.edges);
            for (const d of downstream) changed.push(d);
          }
        }
      }

      if (!changed.length) return;

      const toRun = new Set(changed);
      for (const id of changed) {
        for (const d of downstreamRunnables(id, state.nodes, state.edges)) {
          toRun.add(d);
        }
      }

      for (const id of toRun) {
        const existing = pending.current.get(id);
        if (existing) clearTimeout(existing);
        const handle = setTimeout(async () => {
          pending.current.delete(id);
          const node = useCanvasStore.getState().nodes.find((nn) => nn.id === id);
          if (!node) return;
          if (node.data.disabled) return;

          const spent = tickWindow();
          const budget = useCanvasStore.getState().reactiveBudgetPerMin;
          if (spent >= budget) return;

          recentSpends.current.push({ at: Date.now(), cost: 1 });
          useCanvasStore.getState().noteReactiveSpend(1);

          await executeNode(id);
        }, DEBOUNCE_MS);
        pending.current.set(id, handle);
      }
    });

    return () => {
      unsub();
      pending.current.forEach((t) => clearTimeout(t));
      pending.current.clear();
    };
  }, [reactiveMode]);

  useEffect(() => {
    if (!reactiveMode || !isRunning) return;
    pending.current.forEach((t) => clearTimeout(t));
    pending.current.clear();
  }, [reactiveMode, isRunning]);
}

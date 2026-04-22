"use client";

import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import type { CanvasEdge, CanvasNode, CanvasNodeData, NodeStatus } from "./types";

interface HistorySnapshot {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  reason: string;
}

const HISTORY_MAX = 12;

function snapshot(s: { nodes: CanvasNode[]; edges: CanvasEdge[] }, reason: string): HistorySnapshot {
  return {
    nodes: s.nodes.map((n) => ({ ...n, data: { ...n.data } })),
    edges: s.edges.map((e) => ({ ...e })),
    reason,
  };
}

function pushed(history: HistorySnapshot[], snap: HistorySnapshot): HistorySnapshot[] {
  return [...history, snap].slice(-HISTORY_MAX);
}

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  isRunning: boolean;
  runAbortController: AbortController | null;
  graphVersion: number;
  workflowId: string | null;
  workflowName: string;
  activeSkillIds: string[];
  hydrated: boolean;
  history: HistorySnapshot[];
  rightPanelTab: "inspector" | "chat" | null;
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  replaceGraph: (nodes: CanvasNode[], edges: CanvasEdge[]) => void;
  patchNodeData: <T extends CanvasNodeData>(id: string, patch: Partial<T>) => void;
  setNodeStatus: (id: string, status: NodeStatus, error?: string) => void;
  setEdgesAnimated: (edgeIds: string[], animated: boolean) => void;
  resetRunStatuses: () => void;
  setRunning: (v: boolean) => void;
  setRunAbortController: (c: AbortController | null) => void;
  removeNode: (id: string) => void;
  addNode: (node: CanvasNode) => void;
  removeOrphanEdgesFor: (nodeIds: string[]) => void;
  setWorkflow: (id: string | null, name: string, nodes: CanvasNode[], edges: CanvasEdge[], activeSkillIds?: string[]) => void;
  setWorkflowName: (name: string) => void;
  setActiveSkillIds: (ids: string[]) => void;
  toggleSkillActive: (id: string) => void;
  setHydrated: (v: boolean) => void;
  setRightPanelTab: (t: "inspector" | "chat" | null) => void;
  pushHistory: (reason: string) => void;
  undo: () => HistorySnapshot | null;
  clearHistory: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  isRunning: false,
  runAbortController: null,
  graphVersion: 0,
  workflowId: null,
  workflowName: "Untitled",
  activeSkillIds: [],
  hydrated: false,
  rightPanelTab: null,
  history: [],
  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect: (connection) =>
    set((s) => ({ edges: addEdge({ ...connection, animated: false }, s.edges) })),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  replaceGraph: (nodes, edges) =>
    set((s) => {
      const history =
        s.nodes.length || s.edges.length
          ? pushed(s.history, snapshot(s, "Replace graph"))
          : s.history;
      return {
        nodes,
        edges,
        graphVersion: s.graphVersion + 1,
        history,
      };
    }),
  patchNodeData: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } as CanvasNodeData } : n
      ),
    })),
  setNodeStatus: (id, status, error) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, status, error } as CanvasNodeData }
          : n
      ),
    })),
  setEdgesAnimated: (edgeIds, animated) =>
    set((s) => {
      const ids = new Set(edgeIds);
      return {
        edges: s.edges.map((e) =>
          ids.has(e.id) ? { ...e, animated } : e
        ),
      };
    }),
  resetRunStatuses: () =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.data.kind === "imageRef"
          ? n
          : {
              ...n,
              data: {
                ...n.data,
                status: "idle",
                error: undefined,
              } as CanvasNodeData,
            }
      ),
      edges: s.edges.map((e) => ({ ...e, animated: false })),
    })),
  setRunning: (v) => set({ isRunning: v }),
  setRunAbortController: (c) => set({ runAbortController: c }),
  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      graphVersion: s.graphVersion + 1,
      history: pushed(s.history, snapshot(s, `Delete node ${id}`)),
    })),
  addNode: (node) =>
    set((s) => ({
      nodes: [...s.nodes, node],
    })),
  removeOrphanEdgesFor: (nodeIds) => {
    const ids = new Set(nodeIds);
    set((s) => ({
      edges: s.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
    }));
  },
  setWorkflow: (id, name, nodes, edges, activeSkillIds) =>
    set((s) => ({
      workflowId: id,
      workflowName: name,
      nodes,
      edges,
      activeSkillIds: activeSkillIds ?? [],
      graphVersion: s.graphVersion + 1,
      history: [],
    })),
  setWorkflowName: (name) => set({ workflowName: name }),
  setActiveSkillIds: (ids) => set({ activeSkillIds: ids }),
  toggleSkillActive: (id) =>
    set((s) => {
      const has = s.activeSkillIds.includes(id);
      return {
        activeSkillIds: has
          ? s.activeSkillIds.filter((x) => x !== id)
          : [...s.activeSkillIds, id],
      };
    }),
  setHydrated: (v) => set({ hydrated: v }),
  setRightPanelTab: (t) => set({ rightPanelTab: t }),
  pushHistory: (reason) =>
    set((s) => {
      if (!s.nodes.length && !s.edges.length) return s;
      return { history: pushed(s.history, snapshot(s, reason)) };
    }),
  undo: () => {
    const s = get();
    const last = s.history[s.history.length - 1];
    if (!last) return null;
    set({
      nodes: last.nodes,
      edges: last.edges,
      history: s.history.slice(0, -1),
      graphVersion: s.graphVersion + 1,
    });
    return last;
  },
  clearHistory: () => set({ history: [] }),
}));

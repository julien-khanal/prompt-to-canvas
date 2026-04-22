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

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  isRunning: boolean;
  graphVersion: number;
  workflowId: string | null;
  workflowName: string;
  hydrated: boolean;
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
  removeNode: (id: string) => void;
  addNode: (node: CanvasNode) => void;
  setWorkflow: (id: string | null, name: string, nodes: CanvasNode[], edges: CanvasEdge[]) => void;
  setWorkflowName: (name: string) => void;
  setHydrated: (v: boolean) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  nodes: [],
  edges: [],
  isRunning: false,
  graphVersion: 0,
  workflowId: null,
  workflowName: "Untitled",
  hydrated: false,
  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect: (connection) =>
    set((s) => ({ edges: addEdge({ ...connection, animated: false }, s.edges) })),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  replaceGraph: (nodes, edges) =>
    set((s) => ({ nodes, edges, graphVersion: s.graphVersion + 1 })),
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
  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      graphVersion: s.graphVersion + 1,
    })),
  addNode: (node) =>
    set((s) => ({
      nodes: [...s.nodes, node],
    })),
  setWorkflow: (id, name, nodes, edges) =>
    set((s) => ({
      workflowId: id,
      workflowName: name,
      nodes,
      edges,
      graphVersion: s.graphVersion + 1,
    })),
  setWorkflowName: (name) => set({ workflowName: name }),
  setHydrated: (v) => set({ hydrated: v }),
}));

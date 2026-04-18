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
}

export const useCanvasStore = create<CanvasState>((set) => ({
  nodes: [],
  edges: [],
  isRunning: false,
  graphVersion: 0,
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
}));

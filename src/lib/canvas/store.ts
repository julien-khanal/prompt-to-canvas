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
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  replaceGraph: (nodes: CanvasNode[], edges: CanvasEdge[]) => void;
  patchNodeData: <T extends CanvasNodeData>(id: string, patch: Partial<T>) => void;
  setNodeStatus: (id: string, status: NodeStatus, error?: string) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  nodes: [],
  edges: [],
  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect: (connection) =>
    set((s) => ({ edges: addEdge({ ...connection, animated: false }, s.edges) })),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  replaceGraph: (nodes, edges) => set({ nodes, edges }),
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
}));

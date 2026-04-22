"use client";

import { db } from "./schema";
import type { CanvasEdge, CanvasNode } from "@/lib/canvas/types";

const LAST_OPENED_KEY = "lastOpenedWorkflowId";

export interface WorkflowSummary {
  id: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  updatedAt: number;
  createdAt: number;
}

function newId(): string {
  return `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveWorkflow(
  id: string,
  name: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  activeSkillIds?: string[]
): Promise<void> {
  const existing = await db().workflows.get(id);
  const now = Date.now();
  await db().workflows.put({
    id,
    name,
    nodes,
    edges,
    activeSkillIds: activeSkillIds ?? existing?.activeSkillIds ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

export async function createWorkflow(name?: string): Promise<{ id: string; name: string }> {
  const id = newId();
  const safeName = name?.trim() || `Untitled · ${new Date().toLocaleDateString()}`;
  const now = Date.now();
  await db().workflows.put({
    id,
    name: safeName,
    nodes: [],
    edges: [],
    createdAt: now,
    updatedAt: now,
  });
  return { id, name: safeName };
}

export async function loadWorkflow(id: string): Promise<{
  name: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  activeSkillIds: string[];
} | null> {
  const rec = await db().workflows.get(id);
  if (!rec) return null;
  return {
    name: rec.name,
    nodes: rec.nodes as CanvasNode[],
    edges: rec.edges as CanvasEdge[],
    activeSkillIds: rec.activeSkillIds ?? [],
  };
}

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  const all = await db().workflows.toArray();
  return all
    .map((w) => ({
      id: w.id,
      name: w.name,
      nodeCount: Array.isArray(w.nodes) ? (w.nodes as unknown[]).length : 0,
      edgeCount: Array.isArray(w.edges) ? (w.edges as unknown[]).length : 0,
      updatedAt: w.updatedAt,
      createdAt: w.createdAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteWorkflow(id: string): Promise<void> {
  await db().workflows.delete(id);
}

export async function renameWorkflow(id: string, name: string): Promise<void> {
  const rec = await db().workflows.get(id);
  if (!rec) return;
  await db().workflows.put({ ...rec, name: name.trim() || rec.name, updatedAt: Date.now() });
}

export async function duplicateWorkflow(id: string): Promise<string | null> {
  const rec = await db().workflows.get(id);
  if (!rec) return null;
  const newIdVal = newId();
  const now = Date.now();
  await db().workflows.put({
    ...rec,
    id: newIdVal,
    name: `${rec.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  });
  return newIdVal;
}

export async function setLastOpened(id: string | null): Promise<void> {
  if (id === null) await db().meta.delete(LAST_OPENED_KEY);
  else await db().meta.put({ id: LAST_OPENED_KEY, value: id });
}

export async function getLastOpened(): Promise<string | null> {
  const rec = await db().meta.get(LAST_OPENED_KEY);
  return typeof rec?.value === "string" ? rec.value : null;
}

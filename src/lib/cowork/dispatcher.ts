"use client";

import { useCanvasStore } from "@/lib/canvas/store";
import { buildSnapshot } from "@/lib/chat/snapshot";
import { generateWorkflowFromPrompt } from "@/lib/workflow/client";
import { workflowToCanvas } from "@/lib/workflow/mapToCanvas";
import { executeNode } from "@/lib/executor/executeNode";
import { runWorkflow, abortWorkflowRun } from "@/lib/executor/runWorkflow";
import {
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  loadWorkflow,
  setLastOpened,
} from "@/lib/db/workflows";
import {
  createSkill,
  listSkills,
  updateSkill,
} from "@/lib/db/skills";
import { fetchRefAsDataUrl, type BridgeCommand } from "./clientApi";
import { validateApply } from "@/lib/chat/applyValidation";
import { applyParameters, detectParameters } from "@/lib/workflow/parameters";
import type {
  CanvasEdge,
  CanvasNode,
  CanvasNodeData,
  ImageRefNodeData,
} from "@/lib/canvas/types";

export interface DispatchOutcome {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export async function dispatchCommand(cmd: BridgeCommand): Promise<DispatchOutcome> {
  const payload = (cmd.payload ?? {}) as Record<string, unknown>;
  try {
    switch (cmd.type) {
      case "generate":
        return await onGenerate(payload);
      case "patch_node":
        return onPatchNode(payload);
      case "run_node":
        return await onRunNode(payload);
      case "run_workflow":
        return await onRunWorkflow();
      case "abort_run":
        return onAbortRun();
      case "create_workflow":
        return await onCreateWorkflow(payload);
      case "open_workflow":
        return await onOpenWorkflow(payload);
      case "list_workflows":
        return await onListWorkflows();
      case "create_skill":
        return await onCreateSkill(payload);
      case "toggle_skill":
        return await onToggleSkill(payload);
      case "set_ref_image":
        return await onSetRefImage(payload);
      case "describe_workflow_inputs":
        return await onDescribeInputs(payload);
      case "run_workflow_with_inputs":
        return await onRunWithInputs(payload);
      default:
        return { ok: false, error: `unknown command type: ${cmd.type}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function onGenerate(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const prompt = String(p.prompt ?? "").trim();
  if (!prompt) return { ok: false, error: "prompt required" };
  const mode = p.mode === "replace" ? "replace" : "new";

  const result = await generateWorkflowFromPrompt(prompt);
  if (!result.ok) return { ok: false, error: result.error };
  const { nodes, edges } = await workflowToCanvas(result.workflow);

  const store = useCanvasStore.getState();
  if (mode === "new") {
    const fresh = await createWorkflow(prompt.split("\n")[0].slice(0, 48));
    await setLastOpened(fresh.id);
    store.setWorkflow(fresh.id, fresh.name, nodes, edges, []);
    return { ok: true, result: { workflowId: fresh.id, mode: "new", nodeCount: nodes.length } };
  }
  store.replaceGraph(nodes, edges);
  return {
    ok: true,
    result: { workflowId: store.workflowId, mode: "replace", nodeCount: nodes.length },
  };
}

function onPatchNode(p: Record<string, unknown>): DispatchOutcome {
  const nodeId = String(p.nodeId ?? "").trim();
  const patch = (p.patch ?? {}) as Record<string, unknown>;
  if (!nodeId) return { ok: false, error: "nodeId required" };
  if (!patch || typeof patch !== "object")
    return { ok: false, error: "patch object required" };

  const store = useCanvasStore.getState();
  const node = store.nodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, error: `node ${nodeId} not found` };

  const validated: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(patch)) {
    const v = validateApply(node.data.kind, field, String(value));
    if (!v.ok) return { ok: false, error: v.error };
    validated[field] = v.value;
  }
  validated.cacheHit = false;
  store.pushHistory(`Cowork patch ${nodeId}`);
  store.patchNodeData(nodeId, validated);
  return { ok: true, result: { nodeId, applied: Object.keys(validated) } };
}

async function onRunNode(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const nodeId = String(p.nodeId ?? "").trim();
  if (!nodeId) return { ok: false, error: "nodeId required" };
  const out = await executeNode(nodeId);
  return { ok: out.ok, result: out, error: out.ok ? undefined : out.error };
}

async function onRunWorkflow(): Promise<DispatchOutcome> {
  const out = await runWorkflow();
  return { ok: out.ok, result: out };
}

function onAbortRun(): DispatchOutcome {
  abortWorkflowRun();
  return { ok: true, result: { aborted: true } };
}

async function onCreateWorkflow(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const name = typeof p.name === "string" ? p.name : undefined;
  const fresh = await createWorkflow(name);
  await setLastOpened(fresh.id);
  useCanvasStore.getState().setWorkflow(fresh.id, fresh.name, [], [], []);
  return { ok: true, result: { id: fresh.id, name: fresh.name } };
}

async function onOpenWorkflow(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const id = String(p.id ?? "").trim();
  if (!id) return { ok: false, error: "id required" };
  const wf = await loadWorkflow(id);
  if (!wf) return { ok: false, error: "workflow not found" };
  await setLastOpened(id);
  useCanvasStore.getState().setWorkflow(id, wf.name, wf.nodes, wf.edges, wf.activeSkillIds);
  return {
    ok: true,
    result: { id, name: wf.name, nodeCount: wf.nodes.length, edgeCount: wf.edges.length },
  };
}

async function onListWorkflows(): Promise<DispatchOutcome> {
  const list = await listWorkflows();
  return { ok: true, result: list };
}

async function onCreateSkill(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const name = String(p.name ?? "").trim();
  const description = String(p.description ?? "").trim();
  const body = String(p.body ?? "").trim();
  const active = p.active === true;
  if (!name || !body)
    return { ok: false, error: "name and body required" };
  const sk = await createSkill({
    name,
    description,
    body,
    enabled: false,
    alwaysOn: false,
  });
  if (active) {
    useCanvasStore.getState().toggleSkillActive(sk.id);
  }
  return { ok: true, result: { id: sk.id, active } };
}

async function onToggleSkill(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const skillId = typeof p.skillId === "string" ? p.skillId : null;
  const skillName = typeof p.skillName === "string" ? p.skillName : null;
  const active = p.active;

  const all = await listSkills();
  const target = skillId
    ? all.find((s) => s.id === skillId)
    : skillName
      ? all.find((s) => s.name.toLowerCase() === skillName.toLowerCase())
      : null;
  if (!target) return { ok: false, error: "skill not found" };

  if (typeof p.alwaysOn === "boolean") {
    await updateSkill(target.id, { alwaysOn: p.alwaysOn });
  }

  const store = useCanvasStore.getState();
  const isCurrentlyActive = target.alwaysOn || store.activeSkillIds.includes(target.id);
  const wantActive = typeof active === "boolean" ? active : !isCurrentlyActive;

  if (target.alwaysOn) {
    return {
      ok: true,
      result: { id: target.id, name: target.name, alwaysOn: true, note: "skill is pinned" },
    };
  }
  if (wantActive && !store.activeSkillIds.includes(target.id))
    store.toggleSkillActive(target.id);
  else if (!wantActive && store.activeSkillIds.includes(target.id))
    store.toggleSkillActive(target.id);

  return { ok: true, result: { id: target.id, name: target.name, active: wantActive } };
}

async function onDescribeInputs(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const id = typeof p.workflowId === "string" ? p.workflowId : null;
  let nodes: CanvasNode[];
  let name: string;
  if (id) {
    const wf = await loadWorkflow(id);
    if (!wf) return { ok: false, error: "workflow not found" };
    nodes = wf.nodes;
    name = wf.name;
  } else {
    const s = useCanvasStore.getState();
    nodes = s.nodes;
    name = s.workflowName;
  }
  const params = detectParameters(nodes);
  return {
    ok: true,
    result: {
      workflowId: id ?? useCanvasStore.getState().workflowId,
      workflowName: name,
      parameters: params,
      nodeCount: nodes.length,
    },
  };
}

async function onRunWithInputs(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const id = String(p.workflowId ?? "").trim();
  const inputs = (p.inputs ?? {}) as Record<string, string>;
  if (!id) return { ok: false, error: "workflowId required" };

  const wf = await loadWorkflow(id);
  if (!wf) return { ok: false, error: "workflow not found" };

  const store = useCanvasStore.getState();

  if (store.workflowId !== id) {
    await setLastOpened(id);
    store.setWorkflow(id, wf.name, wf.nodes, wf.edges, wf.activeSkillIds);
  }

  const before = useCanvasStore.getState();
  const originalNodes = before.nodes.map((n) => ({ ...n, data: { ...n.data } }));
  const substituted = applyParameters(originalNodes, inputs);
  store.setNodes(substituted);

  let outcome;
  try {
    outcome = await runWorkflow();
  } finally {
    useCanvasStore.getState().setNodes(originalNodes);
  }

  const finalNodes = useCanvasStore.getState().nodes;
  const outputNodes = finalNodes.filter((n) => n.data.kind === "output");
  const summary = outputNodes.map((n) => {
    if (n.data.kind !== "output") return null;
    return {
      nodeId: n.id,
      label: n.data.label,
      text: n.data.text,
      images: n.data.images,
    };
  });

  return {
    ok: outcome.ok,
    result: {
      workflowId: id,
      ok: outcome.ok,
      failed: outcome.failed,
      skipped: outcome.skipped,
      outputs: summary.filter(Boolean),
    },
  };
}

async function onSetRefImage(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const nodeId = String(p.nodeId ?? "").trim();
  const refId = typeof p.refId === "string" ? p.refId.trim() : null;
  const url = typeof p.url === "string" ? p.url.trim() : null;
  if (!nodeId) return { ok: false, error: "nodeId required" };

  const store = useCanvasStore.getState();
  const node = store.nodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, error: `node ${nodeId} not found` };
  if (node.data.kind !== "imageRef")
    return { ok: false, error: `node ${nodeId} is not an imageRef (kind=${node.data.kind})` };

  store.pushHistory(`Cowork set ref ${nodeId}`);

  if (refId) {
    const dataUrl = await fetchRefAsDataUrl(refId);
    if (!dataUrl) return { ok: false, error: "ref not found or expired" };
    store.patchNodeData<ImageRefNodeData>(nodeId, {
      source: "upload",
      dataUrl,
      url: undefined,
    });
    return { ok: true, result: { nodeId, source: "upload" } };
  }
  if (url) {
    store.patchNodeData<ImageRefNodeData>(nodeId, {
      source: "url",
      url,
      dataUrl: undefined,
    });
    return { ok: true, result: { nodeId, source: "url" } };
  }
  return { ok: false, error: "either refId or url required" };
}

export function buildBridgeSnapshot(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  workflowId: string | null,
  workflowName: string,
  activeSkillIds: string[]
): unknown {
  void (null as unknown as CanvasNodeData);
  const snap = buildSnapshot(workflowName, nodes, edges);
  return {
    workflow: {
      id: workflowId,
      name: snap.name,
      nodes: snap.nodes,
      edges: snap.edges,
      activeSkillIds,
    },
    timestamp: Date.now(),
  };
}

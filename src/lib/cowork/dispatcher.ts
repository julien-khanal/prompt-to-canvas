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
  deleteSkill,
  listSkills,
  updateSkill,
} from "@/lib/db/skills";
import { fetchRefAsDataUrl, type BridgeCommand } from "./clientApi";
import { validateApply } from "@/lib/chat/applyValidation";
import { applyParameters, detectParameters } from "@/lib/workflow/parameters";
import { parseWorkflow } from "@/lib/workflow/schema";
import { applyGeneratorPolicies } from "@/lib/workflow/postProcess";
import { downscaleManyForClaude } from "@/lib/util/downscaleForClaude";
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
      case "list_skills":
        return await onListSkills();
      case "get_skill":
        return await onGetSkill(payload);
      case "delete_skill":
        return await onDeleteSkill(payload);
      case "add_edge":
        return onAddEdge(payload);
      case "remove_edge":
        return onRemoveEdge(payload);
      case "get_node_artifacts":
        return await onGetNodeArtifacts(payload);
      case "read_memory":
        return await onReadMemory(payload);
      case "write_memory":
        return await onWriteMemory(payload);
      case "list_memory":
        return await onListMemory();
      case "apply_workflow":
        return await onApplyWorkflow(payload);
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

  const all = await listSkills();
  const existing = all.find((s) => s.name.toLowerCase() === name.toLowerCase());
  let id: string;
  let updated = false;
  if (existing) {
    await updateSkill(existing.id, { description, body });
    id = existing.id;
    updated = true;
  } else {
    const sk = await createSkill({
      name,
      description,
      body,
      enabled: false,
      alwaysOn: false,
    });
    id = sk.id;
  }

  if (active) {
    const store = useCanvasStore.getState();
    if (!store.activeSkillIds.includes(id)) {
      store.toggleSkillActive(id);
    }
  }
  return { ok: true, result: { id, active, updated } };
}

async function onListSkills(): Promise<DispatchOutcome> {
  const all = await listSkills();
  const store = useCanvasStore.getState();
  return {
    ok: true,
    result: all.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      bytes: s.body.length,
      alwaysOn: s.alwaysOn,
      activeInCurrentWorkflow: store.activeSkillIds.includes(s.id) || s.alwaysOn,
      updatedAt: s.updatedAt,
    })),
  };
}

function onAddEdge(p: Record<string, unknown>): DispatchOutcome {
  const source = typeof p.source === "string" ? p.source.trim() : "";
  const target = typeof p.target === "string" ? p.target.trim() : "";
  if (!source || !target) return { ok: false, error: "source and target required" };
  if (source === target) return { ok: false, error: "self-loop edge not allowed" };
  const store = useCanvasStore.getState();
  const nodeIds = new Set(store.nodes.map((n) => n.id));
  if (!nodeIds.has(source)) return { ok: false, error: `unknown source node "${source}"` };
  if (!nodeIds.has(target)) return { ok: false, error: `unknown target node "${target}"` };
  const exists = store.edges.some((e) => e.source === source && e.target === target);
  if (exists) return { ok: true, result: { added: false, reason: "already exists" } };
  const id = `e-${Date.now().toString(36)}-${source}-${target}`;
  const newEdge: CanvasEdge = { id, source, target, animated: false };
  store.setEdges([...store.edges, newEdge]);
  return { ok: true, result: { added: true, id, source, target } };
}

function onRemoveEdge(p: Record<string, unknown>): DispatchOutcome {
  const source = typeof p.source === "string" ? p.source.trim() : "";
  const target = typeof p.target === "string" ? p.target.trim() : "";
  if (!source || !target) return { ok: false, error: "source and target required" };
  const store = useCanvasStore.getState();
  const before = store.edges.length;
  const remaining = store.edges.filter(
    (e) => !(e.source === source && e.target === target)
  );
  const removed = before - remaining.length;
  if (removed === 0) {
    return { ok: true, result: { removed: 0, reason: "no matching edge" } };
  }
  store.setEdges(remaining);
  return { ok: true, result: { removed, source, target } };
}

async function onGetSkill(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const id = typeof p.id === "string" ? p.id : null;
  const name = typeof p.name === "string" ? p.name : null;
  if (!id && !name) return { ok: false, error: "id or name required" };
  const all = await listSkills();
  const target = id
    ? all.find((s) => s.id === id)
    : all.find((s) => s.name.toLowerCase() === name!.toLowerCase());
  if (!target) return { ok: false, error: "skill not found" };
  const store = useCanvasStore.getState();
  return {
    ok: true,
    result: {
      id: target.id,
      name: target.name,
      description: target.description,
      body: target.body,
      bytes: target.body.length,
      alwaysOn: target.alwaysOn,
      activeInCurrentWorkflow:
        store.activeSkillIds.includes(target.id) || target.alwaysOn,
      updatedAt: target.updatedAt,
    },
  };
}

async function onDeleteSkill(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const id = typeof p.id === "string" ? p.id : null;
  const name = typeof p.name === "string" ? p.name : null;
  if (!id && !name) return { ok: false, error: "id or name required" };
  const all = await listSkills();
  const target = id
    ? all.find((s) => s.id === id)
    : all.find((s) => s.name.toLowerCase() === name!.toLowerCase());
  if (!target) return { ok: false, error: "skill not found" };
  await deleteSkill(target.id);
  const store = useCanvasStore.getState();
  if (store.activeSkillIds.includes(target.id)) {
    store.toggleSkillActive(target.id);
  }
  return { ok: true, result: { deleted: target.id, name: target.name } };
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

  const template = await loadWorkflow(id);
  if (!template) return { ok: false, error: "workflow template not found" };

  const substituted = applyParameters(template.nodes, inputs);
  const inputSummary = Object.values(inputs)
    .map((v) => String(v).trim())
    .filter(Boolean)
    .join(" · ");
  const cloneName = inputSummary
    ? `${template.name} · ${inputSummary}`.slice(0, 80)
    : `${template.name} · run ${new Date().toLocaleString()}`;

  const fresh = await createWorkflow(cloneName);
  await setLastOpened(fresh.id);
  const store = useCanvasStore.getState();
  store.setWorkflow(fresh.id, fresh.name, substituted, template.edges, template.activeSkillIds);

  const outcome = await runWorkflow();

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
      templateWorkflowId: id,
      runWorkflowId: fresh.id,
      runWorkflowName: fresh.name,
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

// ─────────────────────────────────────────────────────────────────────────
// Karpathy-Stage-1 commands (added 2026-04-23): agent vision + memory + apply
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns the artifacts (text output, images) of a single node, with images
 * already downscaled to Claude's 5 MB-per-image limit. Cowork uses this
 * to "see" the canvas without copy-paste — pass the returned images
 * straight to Claude in the next turn.
 */
async function onGetNodeArtifacts(
  p: Record<string, unknown>
): Promise<DispatchOutcome> {
  const nodeId = String(p.nodeId ?? "").trim();
  if (!nodeId) return { ok: false, error: "nodeId required" };
  const store = useCanvasStore.getState();
  const node = store.nodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, error: `node ${nodeId} not found` };

  const data = node.data;
  let text: string | undefined;
  const rawImages: string[] = [];

  switch (data.kind) {
    case "prompt":
      text = data.output;
      break;
    case "imageGen":
      if (data.outputImages?.length) rawImages.push(...data.outputImages);
      else if (data.outputImage) rawImages.push(data.outputImage);
      break;
    case "imageRef": {
      const url = data.dataUrl ?? data.url;
      if (url) rawImages.push(url);
      break;
    }
    case "styleAnchor":
      for (const r of data.references ?? []) if (r.dataUrl) rawImages.push(r.dataUrl);
      if (data.distillate) text = data.distillate;
      break;
    case "output":
      text = data.text;
      if (data.images?.length) rawImages.push(...data.images);
      break;
    case "critic":
      text = [
        data.lastFeedback ? `feedback: ${data.lastFeedback}` : null,
        data.lastSuggestion ? `suggestedPrompt: ${data.lastSuggestion}` : null,
        data.lastScore !== undefined ? `score: ${data.lastScore}/${data.threshold}` : null,
        data.iterations !== undefined ? `iterations: ${data.iterations}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      break;
    case "array":
      text = `items: ${data.items.join(" | ")}`;
      break;
    default:
      break;
  }

  // Compress images to <5 MB each for Claude API compatibility.
  const images = rawImages.length ? await downscaleManyForClaude(rawImages) : [];

  return {
    ok: true,
    result: {
      id: node.id,
      kind: data.kind,
      label: data.label,
      status: data.status,
      hasOutput: !!text || images.length > 0,
      text: text ?? null,
      images,
      imageCount: images.length,
    },
  };
}

function memoryEndpoint(name: string): string {
  return `/api/memory/${encodeURIComponent(name)}`;
}

async function onReadMemory(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const name = String(p.name ?? "").trim();
  if (!name) return { ok: false, error: "name required" };
  try {
    const res = await fetch(memoryEndpoint(name));
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? `http ${res.status}` };
    return { ok: true, result: json };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "memory read failed",
    };
  }
}

async function onWriteMemory(p: Record<string, unknown>): Promise<DispatchOutcome> {
  const name = String(p.name ?? "").trim();
  const content = typeof p.content === "string" ? p.content : null;
  if (!name) return { ok: false, error: "name required" };
  if (content === null) return { ok: false, error: "content (string) required" };
  try {
    const res = await fetch(memoryEndpoint(name), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? `http ${res.status}` };
    return { ok: true, result: json };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "memory write failed",
    };
  }
}

async function onListMemory(): Promise<DispatchOutcome> {
  try {
    const res = await fetch("/api/memory");
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? `http ${res.status}` };
    return { ok: true, result: json };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "memory list failed",
    };
  }
}

/**
 * Apply a workflow JSON drafted by an external agent (Cowork-style flow).
 * Validates via the same parser the generator uses and runs the post-
 * processors so purity rules etc. still apply. The bridge does NO LLM
 * call here — that's the whole point: the agent already drafted, we just
 * validate + apply. Round-trip ~2-5 s vs ~30-45 s for /api/generate-workflow.
 */
async function onApplyWorkflow(
  p: Record<string, unknown>
): Promise<DispatchOutcome> {
  const wfRaw = p.workflow;
  if (!wfRaw || typeof wfRaw !== "object")
    return { ok: false, error: "workflow object required" };

  const mode = p.mode === "replace" ? "replace" : "new";
  const name =
    typeof p.name === "string" && p.name.trim()
      ? p.name.trim().slice(0, 80)
      : undefined;

  let workflow;
  try {
    workflow = applyGeneratorPolicies(parseWorkflow(wfRaw));
  } catch (err) {
    return {
      ok: false,
      error: `workflow validation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const { nodes, edges } = await workflowToCanvas(workflow);
  const store = useCanvasStore.getState();

  if (mode === "new") {
    const fresh = await createWorkflow(name ?? "Cowork-applied workflow");
    await setLastOpened(fresh.id);
    store.setWorkflow(fresh.id, fresh.name, nodes, edges, []);
    return {
      ok: true,
      result: {
        workflowId: fresh.id,
        mode: "new",
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
    };
  }

  store.replaceGraph(nodes, edges);
  return {
    ok: true,
    result: {
      workflowId: store.workflowId,
      mode: "replace",
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
  };
}

"use client";

import { getKey } from "@/lib/crypto/keyring";
import { getCached, hashFor, putCached, type NodeResult } from "@/lib/cache/resultCache";
import { useCanvasStore } from "@/lib/canvas/store";
import type {
  CanvasNode,
  ImageGenNodeData,
  ImageRefNodeData,
  PromptNodeData,
} from "@/lib/canvas/types";

export interface ExecuteOutcome {
  ok: boolean;
  error?: string;
  cacheHit?: boolean;
}

function currentSignal(): AbortSignal | undefined {
  return useCanvasStore.getState().runAbortController?.signal;
}

function isAbort(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "AbortError" || /aborted|abort/i.test(err.message);
}

export async function executeNode(nodeId: string): Promise<ExecuteOutcome> {
  const store = useCanvasStore.getState();
  const node = store.nodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, error: "node not found" };

  const inputs = gatherInputs(node, store.nodes, store.edges);

  switch (node.data.kind) {
    case "prompt": {
      const outcome = await runPrompt(node, node.data, inputs.text);
      if (outcome.ok) refreshDownstreamOutputs(node.id);
      return outcome;
    }
    case "imageGen": {
      const outcome = await runImageGen(node, node.data, inputs.text, inputs.images, inputs.refs);
      if (outcome.ok) refreshDownstreamOutputs(node.id);
      return outcome;
    }
    case "imageRef":
      refreshDownstreamOutputs(node.id);
      return { ok: true };
    case "output":
      return propagateToOutput(node.id, inputs);
  }
}

function refreshDownstreamOutputs(sourceId: string): void {
  const { nodes, edges } = useCanvasStore.getState();
  const visited = new Set<string>();
  const queue: string[] = [sourceId];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const e of edges) {
      if (e.source !== id) continue;
      const target = nodes.find((n) => n.id === e.target);
      if (!target) continue;
      if (target.data.kind === "output") {
        const inputs = gatherInputs(target, nodes, edges);
        void propagateToOutput(target.id, inputs);
      } else {
        queue.push(target.id);
      }
    }
  }
}

interface GatheredInputs {
  text: Array<{ label: string; text: string }>;
  images: string[];
  refs: Array<{ url: string; role?: string; label: string }>;
}

function gatherInputs(
  node: CanvasNode,
  nodes: CanvasNode[],
  edges: { source: string; target: string }[]
): GatheredInputs {
  const sources = edges.filter((e) => e.target === node.id).map((e) => e.source);
  const text: GatheredInputs["text"] = [];
  const images: string[] = [];
  const refs: GatheredInputs["refs"] = [];
  for (const srcId of sources) {
    const src = nodes.find((n) => n.id === srcId);
    if (!src) continue;
    if (src.data.kind === "prompt" && src.data.output) {
      text.push({ label: src.data.label, text: src.data.output });
    } else if (src.data.kind === "imageGen" && src.data.outputImage) {
      images.push(src.data.outputImage);
    } else if (src.data.kind === "imageRef") {
      const ref = src.data as ImageRefNodeData;
      const url = ref.dataUrl ?? ref.url;
      if (!url) continue;
      images.push(url);
      refs.push({ url, role: ref.role, label: ref.label });
    }
  }
  return { text, images, refs };
}

async function runPrompt(
  node: CanvasNode,
  data: PromptNodeData,
  inputs: Array<{ label: string; text: string }>
): Promise<ExecuteOutcome> {
  const store = useCanvasStore.getState();
  const params = {
    kind: "claude",
    model: data.model,
    prompt: data.prompt,
    systemPrompt: data.systemPrompt ?? null,
    temperature: data.temperature,
    inputs,
  };
  const hash = await hashFor(params);
  const cached = await getCached(hash);
  if (cached && cached.kind === "text") {
    store.patchNodeData<PromptNodeData>(node.id, {
      output: cached.text,
      status: "done",
      cacheHit: true,
    });
    return { ok: true, cacheHit: true };
  }

  const apiKey = await getKey("anthropic");
  if (!apiKey) {
    store.setNodeStatus(node.id, "error", "Anthropic key missing");
    return { ok: false, error: "Anthropic key missing" };
  }

  store.patchNodeData<PromptNodeData>(node.id, {
    status: "running",
    cacheHit: false,
    error: undefined,
  });

  try {
    const res = await fetch("/api/claude/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: data.model,
        prompt: data.prompt,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
        inputs,
        apiKey,
      }),
      signal: currentSignal(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `http ${res.status}`);
    const result: NodeResult = { kind: "text", text: json.text ?? "" };
    await putCached(hash, result);
    store.patchNodeData<PromptNodeData>(node.id, {
      output: result.text,
      status: "done",
    });
    return { ok: true };
  } catch (err) {
    if (isAbort(err)) {
      store.setNodeStatus(node.id, "idle", undefined);
      return { ok: false, error: "aborted" };
    }
    const msg = err instanceof Error ? err.message : "unknown error";
    store.setNodeStatus(node.id, "error", msg);
    return { ok: false, error: msg };
  }
}

async function runImageGen(
  node: CanvasNode,
  data: ImageGenNodeData,
  upstreamText: Array<{ label: string; text: string }>,
  refImages: string[],
  refs: Array<{ url: string; role?: string; label: string }>
): Promise<ExecuteOutcome> {
  const store = useCanvasStore.getState();

  if (data.outputOverride && data.outputImage) {
    store.patchNodeData<ImageGenNodeData>(node.id, {
      status: "done",
      cacheHit: true,
      error: undefined,
    });
    return { ok: true, cacheHit: true };
  }

  const roleHint = refs.length
    ? `\n\nReferences provided (in order):\n${refs
        .map(
          (r, i) =>
            `- Reference ${i + 1} (${r.label}): use for ${r.role ?? "visual guidance"}.`
        )
        .join("\n")}`
    : "";
  const effectivePrompt = upstreamText.length
    ? `${data.prompt}${roleHint}\n\nContext:\n${upstreamText.map((i) => i.text).join("\n\n")}`
    : `${data.prompt}${roleHint}`;

  const params = {
    kind: "gemini",
    model: data.model,
    prompt: effectivePrompt,
    aspectRatio: data.aspectRatio,
    resolution: data.resolution,
    refImageHashes: refImages.slice().sort(),
    refRoles: refs.map((r) => r.role ?? "").sort(),
  };
  const hash = await hashFor(params);
  const cached = await getCached(hash);
  if (cached && cached.kind === "image") {
    store.patchNodeData<ImageGenNodeData>(node.id, {
      outputImage: cached.dataUrl,
      status: "done",
      cacheHit: true,
    });
    return { ok: true, cacheHit: true };
  }

  const apiKey = await getKey("gemini");
  if (!apiKey) {
    store.setNodeStatus(node.id, "error", "Gemini key missing");
    return { ok: false, error: "Gemini key missing" };
  }

  store.patchNodeData<ImageGenNodeData>(node.id, {
    status: "running",
    cacheHit: false,
    error: undefined,
  });

  try {
    const res = await fetch("/api/gemini/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: data.model,
        prompt: effectivePrompt,
        aspectRatio: data.aspectRatio,
        resolution: data.resolution,
        refImages,
        apiKey,
      }),
      signal: currentSignal(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `http ${res.status}`);
    const result: NodeResult = { kind: "image", dataUrl: json.dataUrl, mime: json.mime };
    await putCached(hash, result);
    store.patchNodeData<ImageGenNodeData>(node.id, {
      outputImage: result.dataUrl,
      status: "done",
    });
    return { ok: true };
  } catch (err) {
    if (isAbort(err)) {
      store.setNodeStatus(node.id, "idle", undefined);
      return { ok: false, error: "aborted" };
    }
    const msg = err instanceof Error ? err.message : "unknown error";
    store.setNodeStatus(node.id, "error", msg);
    return { ok: false, error: msg };
  }
}

async function propagateToOutput(
  nodeId: string,
  inputs: GatheredInputs
): Promise<ExecuteOutcome> {
  const store = useCanvasStore.getState();
  store.patchNodeData(nodeId, {
    status: "done",
    text: inputs.text.map((i) => `## ${i.label}\n${i.text}`).join("\n\n") || undefined,
    images: inputs.images.length ? inputs.images : undefined,
  });
  return { ok: true };
}

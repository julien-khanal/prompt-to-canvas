"use client";

import { getKey } from "@/lib/crypto/keyring";
import { getCached, hashFor, putCached, type NodeResult } from "@/lib/cache/resultCache";
import { useCanvasStore } from "@/lib/canvas/store";
import type {
  CanvasNode,
  CriticNodeData,
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

  if (node.data.disabled === "mute") {
    return { ok: false, error: "muted" };
  }

  const inputs = gatherInputs(node, store.nodes, store.edges);

  if (node.data.disabled === "bypass") {
    return passThrough(node, inputs);
  }

  switch (node.data.kind) {
    case "prompt": {
      const outcome = await runPrompt(node, node.data, inputs.text);
      if (outcome.ok) refreshDownstreamOutputs(node.id);
      return outcome;
    }
    case "imageGen": {
      const outcome = inputs.variantItems.length
        ? await runImageGenVariants(node, node.data, inputs)
        : await runImageGen(node, node.data, inputs.text, inputs.images, inputs.refs);
      if (outcome.ok) refreshDownstreamOutputs(node.id);
      return outcome;
    }
    case "array":
      useCanvasStore.getState().setNodeStatus(node.id, "done");
      refreshDownstreamOutputs(node.id);
      return { ok: true };
    case "critic":
      return await runCritic(node, node.data);
    case "imageRef":
      refreshDownstreamOutputs(node.id);
      return { ok: true };
    case "output":
      return propagateToOutput(node.id, inputs);
    case "compare":
      store.setNodeStatus(node.id, "done");
      return { ok: true };
  }
}

async function runCritic(
  node: CanvasNode,
  data: CriticNodeData
): Promise<ExecuteOutcome> {
  const store = useCanvasStore.getState();
  const incoming = store.edges.filter((e) => e.target === node.id);
  if (!incoming.length) {
    store.setNodeStatus(node.id, "error", "No incoming edge — connect a Prompt or Image node");
    return { ok: false, error: "no upstream" };
  }
  const sourceId = incoming[0].source;
  const apiKey = await getKey("anthropic");
  if (!apiKey) {
    store.setNodeStatus(node.id, "error", "Anthropic key missing");
    return { ok: false, error: "Anthropic key missing" };
  }

  if (!data.criteria?.trim()) {
    store.setNodeStatus(
      node.id,
      "error",
      "Critic has no criteria — open Inspector and add evaluation criteria."
    );
    return { ok: false, error: "criteria empty" };
  }

  const maxIter = Math.max(1, Math.min(5, data.maxIterations));
  let iter = 0;

  while (iter < maxIter) {
    iter += 1;
    store.patchNodeData<CriticNodeData>(node.id, {
      status: "running",
      error: undefined,
      iterations: iter,
    });

    const source = useCanvasStore.getState().nodes.find((n) => n.id === sourceId);
    if (!source) {
      store.setNodeStatus(node.id, "error", "upstream node disappeared");
      return { ok: false, error: "upstream missing" };
    }

    let sourceText: string | undefined;
    let sourceImage: string | undefined;
    let sourcePromptText = "";
    if (source.data.kind === "prompt") {
      sourceText = source.data.output;
      sourcePromptText = source.data.prompt;
    } else if (source.data.kind === "imageGen") {
      sourceImage = source.data.outputImage;
      sourcePromptText = source.data.prompt;
    } else {
      store.setNodeStatus(
        node.id,
        "error",
        "Critic only supports Prompt or Image upstream"
      );
      return { ok: false, error: "unsupported source kind" };
    }
    if (!sourceText && !sourceImage) {
      store.setNodeStatus(node.id, "error", "Upstream has no output yet — run it first");
      return { ok: false, error: "no upstream output" };
    }

    let judgeJson: { score: number | null; feedback?: string; suggestedPrompt?: string };
    try {
      const res = await fetch("/api/claude/judge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: data.model,
          criteria: data.criteria,
          sourcePrompt: sourcePromptText,
          sourceText,
          sourceImageDataUrl: sourceImage,
          apiKey,
        }),
        signal: currentSignal(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `http ${res.status}`);
      judgeJson = json;
    } catch (err) {
      if (isAbort(err)) {
        store.setNodeStatus(node.id, "idle", undefined);
        return { ok: false, error: "aborted" };
      }
      const msg = err instanceof Error ? err.message : "unknown error";
      store.setNodeStatus(node.id, "error", msg);
      return { ok: false, error: msg };
    }

    const score = typeof judgeJson.score === "number" ? judgeJson.score : 0;
    store.patchNodeData<CriticNodeData>(node.id, {
      lastScore: score,
      lastFeedback: judgeJson.feedback ?? "",
      lastSuggestion: judgeJson.suggestedPrompt ?? "",
      iterations: iter,
    });

    if (score >= data.threshold) {
      store.patchNodeData<CriticNodeData>(node.id, { status: "done" });
      return { ok: true };
    }
    if (iter >= maxIter) {
      store.patchNodeData<CriticNodeData>(node.id, { status: "done" });
      return { ok: true };
    }
    const suggestion = (judgeJson.suggestedPrompt ?? "").trim();
    if (!suggestion) {
      store.patchNodeData<CriticNodeData>(node.id, { status: "done" });
      return { ok: true };
    }

    const bumpSrc = useCanvasStore.getState().nodes.find((n) => n.id === sourceId);
    if (bumpSrc) {
      const bump =
        ((bumpSrc.data as { cacheBust?: number }).cacheBust ?? 0) + 1;
      store.patchNodeData(sourceId, { prompt: suggestion, cacheBust: bump });
    }
    const srcOutcome = await executeNode(sourceId);
    if (!srcOutcome.ok) {
      store.setNodeStatus(node.id, "error", `upstream re-run failed: ${srcOutcome.error ?? ""}`);
      return { ok: false, error: srcOutcome.error };
    }
  }

  store.patchNodeData<CriticNodeData>(node.id, { status: "done" });
  return { ok: true };
}

async function passThrough(
  node: CanvasNode,
  inputs: GatheredInputs
): Promise<ExecuteOutcome> {
  const store = useCanvasStore.getState();
  switch (node.data.kind) {
    case "prompt": {
      const text = inputs.text[0]?.text ?? "";
      store.patchNodeData<PromptNodeData>(node.id, {
        output: text,
        status: "done",
        cacheHit: true,
      });
      return { ok: true, cacheHit: true };
    }
    case "imageGen": {
      const img = inputs.images[0];
      store.patchNodeData<ImageGenNodeData>(node.id, {
        outputImage: img,
        status: "done",
        cacheHit: true,
      });
      return { ok: true, cacheHit: true };
    }
    default:
      store.setNodeStatus(node.id, "done");
      return { ok: true };
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
  variantItems: string[];
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
  const variantItems: string[] = [];
  for (const srcId of sources) {
    const src = nodes.find((n) => n.id === srcId);
    if (!src) continue;
    if (src.data.kind === "prompt" && src.data.output) {
      text.push({ label: src.data.label, text: src.data.output });
    } else if (src.data.kind === "imageGen") {
      if (src.data.outputImages && src.data.outputImages.length > 0) {
        for (const u of src.data.outputImages) images.push(u);
      } else if (src.data.outputImage) {
        images.push(src.data.outputImage);
      }
    } else if (src.data.kind === "imageRef") {
      const ref = src.data as ImageRefNodeData;
      const url = ref.dataUrl ?? ref.url;
      if (!url) continue;
      images.push(url);
      refs.push({ url, role: ref.role, label: ref.label });
    } else if (src.data.kind === "array") {
      for (const it of src.data.items) {
        const trimmed = it.trim();
        if (trimmed) variantItems.push(trimmed);
      }
    }
  }
  return { text, images, refs, variantItems };
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
    cacheBust: data.cacheBust ?? 0,
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

async function runImageGenVariants(
  node: CanvasNode,
  data: ImageGenNodeData,
  inputs: GatheredInputs
): Promise<ExecuteOutcome> {
  const store = useCanvasStore.getState();
  const apiKey = await getKey("gemini");
  if (!apiKey) {
    store.setNodeStatus(node.id, "error", "Gemini key missing");
    return { ok: false, error: "Gemini key missing" };
  }

  const items = inputs.variantItems;
  store.patchNodeData<ImageGenNodeData>(node.id, {
    status: "running",
    error: undefined,
    outputImages: undefined,
    outputImage: undefined,
    cacheHit: false,
    variantProgress: { done: 0, total: items.length },
  });

  const collected: string[] = [];
  let cacheHits = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const variantPrompt = `${data.prompt}\n\nVariant focus: ${item}`;
    const params = {
      kind: "gemini",
      model: data.model,
      prompt: variantPrompt,
      aspectRatio: data.aspectRatio,
      resolution: data.resolution,
      refImageHashes: inputs.images.slice().sort(),
      refRoles: inputs.refs.map((r) => r.role ?? "").sort(),
      variantIndex: i,
      variantTotal: items.length,
      cacheBust: data.cacheBust ?? 0,
    };
    const hash = await hashFor(params);
    const cached = await getCached(hash);
    if (cached && cached.kind === "image") {
      collected.push(cached.dataUrl);
      cacheHits += 1;
      store.patchNodeData<ImageGenNodeData>(node.id, {
        outputImages: [...collected],
        variantProgress: { done: collected.length, total: items.length },
      });
      continue;
    }
    try {
      const res = await fetch("/api/gemini/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: data.model,
          prompt: variantPrompt,
          aspectRatio: data.aspectRatio,
          resolution: data.resolution,
          refImages: inputs.images,
          apiKey,
        }),
        signal: currentSignal(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `http ${res.status}`);
      const result: NodeResult = { kind: "image", dataUrl: json.dataUrl, mime: json.mime };
      await putCached(hash, result);
      collected.push(result.dataUrl);
      store.patchNodeData<ImageGenNodeData>(node.id, {
        outputImages: [...collected],
        variantProgress: { done: collected.length, total: items.length },
      });
    } catch (err) {
      if (isAbort(err)) {
        store.patchNodeData<ImageGenNodeData>(node.id, {
          status: "idle",
          variantProgress: undefined,
        });
        return { ok: false, error: "aborted" };
      }
      const msg = err instanceof Error ? err.message : "unknown error";
      store.setNodeStatus(node.id, "error", msg);
      store.patchNodeData<ImageGenNodeData>(node.id, { variantProgress: undefined });
      return { ok: false, error: msg };
    }
  }

  store.patchNodeData<ImageGenNodeData>(node.id, {
    status: "done",
    outputImage: collected[0],
    outputImages: collected,
    cacheHit: cacheHits === items.length && items.length > 0,
    variantProgress: undefined,
  });
  return { ok: true, cacheHit: cacheHits === items.length && items.length > 0 };
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
    cacheBust: data.cacheBust ?? 0,
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

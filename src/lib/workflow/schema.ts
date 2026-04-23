import type {
  AspectRatio,
  ClaudeModel,
  GeminiImageModel,
  ImageResolution,
} from "@/lib/canvas/types";

export type WfNodeType =
  | "prompt"
  | "imageGen"
  | "imageRef"
  | "output"
  | "critic"
  | "array"
  | "compare"
  | "styleAnchor";

export interface WfNodePrompt {
  id: string;
  type: "prompt";
  label: string;
  config: {
    model: ClaudeModel;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
  };
}

export interface WfNodeImageGen {
  id: string;
  type: "imageGen";
  label: string;
  config: {
    model: GeminiImageModel;
    prompt: string;
    aspectRatio: AspectRatio;
    resolution: ImageResolution;
  };
}

export interface WfNodeImageRef {
  id: string;
  type: "imageRef";
  label: string;
  config: {
    source: "upload" | "url";
    url?: string;
  };
}

export interface WfNodeOutput {
  id: string;
  type: "output";
  label: string;
  config: Record<string, never>;
}

export interface WfNodeCritic {
  id: string;
  type: "critic";
  label: string;
  config: {
    model: ClaudeModel;
    criteria: string;
    threshold: number; // 1–10
    maxIterations: number; // 1–5
  };
}

export interface WfNodeArray {
  id: string;
  type: "array";
  label: string;
  config: {
    items: string[];
  };
}

export interface WfNodeCompare {
  id: string;
  type: "compare";
  label: string;
  config: {
    splitPercent?: number; // 0–100, default 50
  };
}

export interface WfNodeStyleAnchor {
  id: string;
  type: "styleAnchor";
  label: string;
  config: {
    distillate?: string; // generator-supplied seed text; user can refine via UI
    // references[] is filled by user via upload UI; generator never emits image bytes
  };
}

export type WfNode =
  | WfNodePrompt
  | WfNodeImageGen
  | WfNodeImageRef
  | WfNodeOutput
  | WfNodeCritic
  | WfNodeArray
  | WfNodeCompare
  | WfNodeStyleAnchor;

export interface WfEdge {
  source: string;
  target: string;
}

export interface Workflow {
  nodes: WfNode[];
  edges: WfEdge[];
}

const CLAUDE_MODELS = new Set(["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"]);
const GEMINI_MODELS = new Set(["gemini-3-pro-image-preview", "gemini-2.5-flash-image"]);
const ASPECTS = new Set(["1:1", "16:9", "9:16", "4:3"]);
const RESOLUTIONS = new Set(["1K", "2K", "4K"]);

export function parseWorkflow(raw: unknown): Workflow {
  if (!raw || typeof raw !== "object") throw new Error("workflow is not an object");
  const obj = raw as Record<string, unknown>;
  const nodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const edges = Array.isArray(obj.edges) ? obj.edges : [];
  if (!nodes.length) throw new Error("workflow has no nodes");

  const seenIds = new Set<string>();
  const parsedNodes: WfNode[] = nodes.map((n, idx) => {
    const node = parseNode(n, idx);
    if (seenIds.has(node.id)) throw new Error(`duplicate node id "${node.id}"`);
    seenIds.add(node.id);
    return node;
  });

  const parsedEdges: WfEdge[] = edges.map((e, idx) => {
    if (!e || typeof e !== "object") throw new Error(`edge ${idx} invalid`);
    const ee = e as Record<string, unknown>;
    if (typeof ee.source !== "string" || typeof ee.target !== "string")
      throw new Error(`edge ${idx} missing source/target`);
    if (!seenIds.has(ee.source)) throw new Error(`edge ${idx} unknown source "${ee.source}"`);
    if (!seenIds.has(ee.target)) throw new Error(`edge ${idx} unknown target "${ee.target}"`);
    return { source: ee.source, target: ee.target };
  });

  return { nodes: parsedNodes, edges: parsedEdges };
}

function parseNode(n: unknown, idx: number): WfNode {
  if (!n || typeof n !== "object") throw new Error(`node ${idx} invalid`);
  const node = n as Record<string, unknown>;
  const id = typeof node.id === "string" ? node.id : null;
  const type = typeof node.type === "string" ? node.type : null;
  const label = typeof node.label === "string" ? node.label : null;
  const cfg = (node.config as Record<string, unknown>) ?? {};
  if (!id) throw new Error(`node ${idx} missing id`);
  if (!label) throw new Error(`node ${id} missing label`);

  switch (type) {
    case "prompt": {
      const model = String(cfg.model ?? "claude-sonnet-4-6");
      if (!CLAUDE_MODELS.has(model)) throw new Error(`node ${id} invalid model "${model}"`);
      const prompt = String(cfg.prompt ?? "");
      if (!prompt) throw new Error(`node ${id} empty prompt`);
      const temperature = typeof cfg.temperature === "number" ? cfg.temperature : 0.7;
      const systemPrompt =
        typeof cfg.systemPrompt === "string" ? cfg.systemPrompt : undefined;
      return {
        id,
        type: "prompt",
        label,
        config: { model: model as ClaudeModel, prompt, temperature, systemPrompt },
      };
    }
    case "imageGen": {
      const model = String(cfg.model ?? "gemini-2.5-flash-image");
      if (!GEMINI_MODELS.has(model)) throw new Error(`node ${id} invalid model "${model}"`);
      const aspect = String(cfg.aspectRatio ?? "1:1");
      if (!ASPECTS.has(aspect)) throw new Error(`node ${id} invalid aspectRatio`);
      const resolution = String(cfg.resolution ?? "1K");
      if (!RESOLUTIONS.has(resolution)) throw new Error(`node ${id} invalid resolution`);
      return {
        id,
        type: "imageGen",
        label,
        config: {
          model: model as GeminiImageModel,
          prompt: String(cfg.prompt ?? ""),
          aspectRatio: aspect as AspectRatio,
          resolution: resolution as ImageResolution,
        },
      };
    }
    case "imageRef": {
      const source = cfg.source === "upload" || cfg.source === "url" ? cfg.source : "url";
      const url = typeof cfg.url === "string" ? cfg.url : undefined;
      return { id, type: "imageRef", label, config: { source, url } };
    }
    case "output":
      return { id, type: "output", label, config: {} as Record<string, never> };
    case "critic": {
      const model = String(cfg.model ?? "claude-sonnet-4-6");
      if (!CLAUDE_MODELS.has(model)) throw new Error(`node ${id} invalid model "${model}"`);
      const criteria = String(cfg.criteria ?? "").trim();
      if (!criteria) throw new Error(`node ${id} empty criteria`);
      const rawThreshold = typeof cfg.threshold === "number" ? cfg.threshold : 8;
      const threshold = Math.min(10, Math.max(1, Math.round(rawThreshold)));
      const rawMax = typeof cfg.maxIterations === "number" ? cfg.maxIterations : 3;
      const maxIterations = Math.min(5, Math.max(1, Math.round(rawMax)));
      return {
        id,
        type: "critic",
        label,
        config: { model: model as ClaudeModel, criteria, threshold, maxIterations },
      };
    }
    case "array": {
      const rawItems = Array.isArray(cfg.items) ? cfg.items : [];
      const items = rawItems
        .map((it) => (typeof it === "string" ? it.trim() : ""))
        .filter((it) => it.length > 0);
      if (!items.length) throw new Error(`node ${id} array needs at least one item`);
      return { id, type: "array", label, config: { items } };
    }
    case "compare": {
      const rawSplit = typeof cfg.splitPercent === "number" ? cfg.splitPercent : 50;
      const splitPercent = Math.min(100, Math.max(0, Math.round(rawSplit)));
      return { id, type: "compare", label, config: { splitPercent } };
    }
    case "styleAnchor": {
      const distillate =
        typeof cfg.distillate === "string" && cfg.distillate.trim().length
          ? cfg.distillate.trim()
          : undefined;
      return { id, type: "styleAnchor", label, config: { distillate } };
    }
    default:
      throw new Error(`node ${id} unknown type "${type}"`);
  }
}

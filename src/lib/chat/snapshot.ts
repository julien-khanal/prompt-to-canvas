import type { CanvasEdge, CanvasNode } from "@/lib/canvas/types";

export interface WorkflowSnapshot {
  name: string;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    summary: Record<string, unknown>;
  }>;
  edges: Array<{ source: string; target: string }>;
}

export function buildSnapshot(
  name: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): WorkflowSnapshot {
  return {
    name,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? n.data.kind,
      label: n.data.label,
      summary: nodeSummary(n),
    })),
    edges: edges.map((e) => ({ source: e.source, target: e.target })),
  };
}

function nodeSummary(n: CanvasNode): Record<string, unknown> {
  switch (n.data.kind) {
    case "prompt":
      return {
        model: n.data.model,
        temperature: n.data.temperature,
        prompt: truncate(n.data.prompt, 600),
        systemPrompt: n.data.systemPrompt
          ? truncate(n.data.systemPrompt, 200)
          : undefined,
        hasOutput: !!n.data.output,
      };
    case "imageGen":
      return {
        model: n.data.model,
        aspectRatio: n.data.aspectRatio,
        resolution: n.data.resolution,
        prompt: truncate(n.data.prompt, 600),
        hasOutput: !!(n.data.outputImage || n.data.outputImages?.length),
        variantCount: n.data.outputImages?.length ?? (n.data.outputImage ? 1 : 0),
      };
    case "imageRef":
      return {
        role: n.data.role ?? "style",
        source: n.data.source,
        hasImage: !!(n.data.url || n.data.dataUrl),
      };
    case "output":
      return {
        hasText: !!n.data.text,
        imageCount: n.data.images?.length ?? 0,
      };
    case "compare":
      return {
        splitPercent: n.data.splitPercent ?? 50,
        hasLeft: !!n.data.leftImage,
        hasRight: !!n.data.rightImage,
      };
    case "array":
      return {
        items: n.data.items,
        itemCount: n.data.items.length,
      };
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

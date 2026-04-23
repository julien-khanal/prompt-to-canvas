import type {
  ArrayNodeData,
  CanvasEdge,
  CanvasNode,
  CompareNodeData,
  CriticNodeData,
  ImageGenNodeData,
  ImageRefNodeData,
  OutputNodeData,
  PromptNodeData,
  StyleAnchorNodeData,
} from "@/lib/canvas/types";
import type { Workflow } from "./schema";
import { layoutWorkflow } from "./layout";

export async function workflowToCanvas(
  wf: Workflow
): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  const positions = await layoutWorkflow(wf);
  const posMap = new Map(positions.map((p) => [p.id, p]));

  const nodes: CanvasNode[] = wf.nodes.map((n) => {
    const pos = posMap.get(n.id) ?? { x: 0, y: 0 };
    switch (n.type) {
      case "prompt": {
        const data: PromptNodeData = {
          kind: "prompt",
          label: n.label,
          status: "idle",
          model: n.config.model,
          prompt: n.config.prompt,
          systemPrompt: n.config.systemPrompt,
          temperature: n.config.temperature ?? 0.7,
        };
        return { id: n.id, type: "prompt", position: pos, data };
      }
      case "imageGen": {
        const data: ImageGenNodeData = {
          kind: "imageGen",
          label: n.label,
          status: "idle",
          model: n.config.model,
          prompt: n.config.prompt,
          aspectRatio: n.config.aspectRatio,
          resolution: n.config.resolution,
        };
        return { id: n.id, type: "imageGen", position: pos, data };
      }
      case "imageRef": {
        const data: ImageRefNodeData = {
          kind: "imageRef",
          label: n.label,
          status: "idle",
          source: n.config.source,
          url: n.config.url,
          role: n.config.role,
        };
        return { id: n.id, type: "imageRef", position: pos, data };
      }
      case "output": {
        const data: OutputNodeData = {
          kind: "output",
          label: n.label,
          status: "idle",
        };
        return { id: n.id, type: "output", position: pos, data };
      }
      case "critic": {
        const data: CriticNodeData = {
          kind: "critic",
          label: n.label,
          status: "idle",
          model: n.config.model,
          criteria: n.config.criteria,
          threshold: n.config.threshold,
          maxIterations: n.config.maxIterations,
        };
        return { id: n.id, type: "critic", position: pos, data };
      }
      case "array": {
        const data: ArrayNodeData = {
          kind: "array",
          label: n.label,
          status: "idle",
          items: n.config.items,
        };
        return { id: n.id, type: "array", position: pos, data };
      }
      case "compare": {
        const data: CompareNodeData = {
          kind: "compare",
          label: n.label,
          status: "idle",
          splitPercent: n.config.splitPercent ?? 50,
        };
        return { id: n.id, type: "compare", position: pos, data };
      }
      case "styleAnchor": {
        const data: StyleAnchorNodeData = {
          kind: "styleAnchor",
          label: n.label,
          status: "idle",
          references: [],
          distillate: n.config.distillate,
        };
        return { id: n.id, type: "styleAnchor", position: pos, data };
      }
    }
  });

  const edges: CanvasEdge[] = wf.edges.map((e, i) => ({
    id: `e-${i}-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
  }));

  return { nodes, edges };
}

import ELK from "elkjs/lib/elk.bundled.js";
import type { Workflow } from "./schema";

const elk = new ELK();

const NODE_WIDTH = 300;
const NODE_HEIGHT = 200;

export interface LayoutPosition {
  id: string;
  x: number;
  y: number;
}

export async function layoutWorkflow(wf: Workflow): Promise<LayoutPosition[]> {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "90",
      "elk.spacing.nodeNode": "44",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
    children: wf.nodes.map((n) => ({
      id: n.id,
      width: n.type === "imageGen" || n.type === "output" ? 320 : NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: wf.edges.map((e, i) => ({
      id: `e-${i}`,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const result = await elk.layout(graph);
  return (result.children ?? []).map((c) => ({
    id: c.id!,
    x: c.x ?? 0,
    y: c.y ?? 0,
  }));
}

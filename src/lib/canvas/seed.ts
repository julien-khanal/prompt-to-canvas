import type { CanvasEdge, CanvasNode } from "./types";

export const seedNodes: CanvasNode[] = [
  {
    id: "p1",
    type: "prompt",
    position: { x: -420, y: -80 },
    data: {
      kind: "prompt",
      label: "Concept",
      status: "idle",
      model: "claude-sonnet-4-6",
      prompt: "Describe a magenta Telekom Speedport router in a spring meadow.",
      temperature: 0.7,
    },
  },
  {
    id: "r1",
    type: "imageRef",
    position: { x: -420, y: 200 },
    data: {
      kind: "imageRef",
      label: "Brand reference",
      status: "idle",
      source: "url",
    },
  },
  {
    id: "i1",
    type: "imageGen",
    position: { x: 60, y: 60 },
    data: {
      kind: "imageGen",
      label: "Hero variation",
      status: "idle",
      model: "gemini-3-pro-image-preview",
      prompt: "Photographic, golden-hour, editorial framing.",
      aspectRatio: "16:9",
      resolution: "2K",
    },
  },
  {
    id: "o1",
    type: "output",
    position: { x: 520, y: 60 },
    data: {
      kind: "output",
      label: "Final",
      status: "idle",
    },
  },
];

export const seedEdges: CanvasEdge[] = [
  { id: "e-p1-i1", source: "p1", target: "i1" },
  { id: "e-r1-i1", source: "r1", target: "i1" },
  { id: "e-i1-o1", source: "i1", target: "o1" },
];

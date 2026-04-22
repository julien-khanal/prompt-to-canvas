import type { CanvasNode, CanvasNodeData } from "./types";

type Kind = CanvasNodeData["kind"];

let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function createNode(kind: Kind, position: { x: number; y: number }): CanvasNode {
  switch (kind) {
    case "prompt":
      return {
        id: newId("p"),
        type: "prompt",
        position,
        data: {
          kind: "prompt",
          label: "Prompt",
          status: "idle",
          model: "claude-sonnet-4-6",
          prompt: "",
          temperature: 0.7,
        },
      };
    case "imageGen":
      return {
        id: newId("i"),
        type: "imageGen",
        position,
        data: {
          kind: "imageGen",
          label: "Image",
          status: "idle",
          model: "gemini-3-pro-image-preview",
          prompt: "",
          aspectRatio: "1:1",
          resolution: "1K",
        },
      };
    case "imageRef":
      return {
        id: newId("r"),
        type: "imageRef",
        position,
        data: {
          kind: "imageRef",
          label: "Reference",
          status: "idle",
          source: "url",
          role: "style",
        },
      };
    case "output":
      return {
        id: newId("o"),
        type: "output",
        position,
        data: {
          kind: "output",
          label: "Output",
          status: "idle",
        },
      };
    case "compare":
      return {
        id: newId("c"),
        type: "compare",
        position,
        data: {
          kind: "compare",
          label: "Compare",
          status: "idle",
          splitPercent: 50,
        },
      };
  }
}

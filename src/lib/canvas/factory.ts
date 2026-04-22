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
    case "array":
      return {
        id: newId("a"),
        type: "array",
        position,
        data: {
          kind: "array",
          label: "Variants",
          status: "idle",
          items: ["cinematic, golden hour", "studio, neutral background", "overhead flat-lay"],
        },
      };
    case "critic":
      return {
        id: newId("k"),
        type: "critic",
        position,
        data: {
          kind: "critic",
          label: "Judge",
          status: "idle",
          model: "claude-sonnet-4-6",
          criteria:
            "Evaluate how well the artifact matches the brand/voice/style we are aiming for. Be specific and actionable.",
          threshold: 8,
          maxIterations: 3,
        },
      };
    case "styleAnchor":
      return {
        id: newId("s"),
        type: "styleAnchor",
        position,
        data: {
          kind: "styleAnchor",
          label: "Style Anchor",
          status: "idle",
          references: [],
        },
      };
  }
}

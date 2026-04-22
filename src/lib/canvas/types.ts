import type { Node, Edge } from "@xyflow/react";

export type NodeStatus = "idle" | "running" | "done" | "error";

export type ClaudeModel =
  | "claude-opus-4-7"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5";

export type GeminiImageModel =
  | "gemini-3-pro-image-preview"
  | "gemini-2.5-flash-image";

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3";
export type ImageResolution = "1K" | "2K" | "4K";

export type DisabledMode = "bypass" | "mute";

export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  status: NodeStatus;
  error?: string;
  cacheHit?: boolean;
  disabled?: DisabledMode;
}

export interface PromptNodeData extends BaseNodeData {
  kind: "prompt";
  model: ClaudeModel;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  output?: string;
  cacheBust?: number;
}

export type FluxModel = "fal-flux-schnell" | "fal-flux-dev" | "fal-flux-pro";
export type ImageGenModel = GeminiImageModel | FluxModel;

export interface ImageGenNodeData extends BaseNodeData {
  kind: "imageGen";
  model: ImageGenModel;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  outputImage?: string;
  outputImages?: string[];
  outputOverride?: boolean;
  variantProgress?: { done: number; total: number };
  cacheBust?: number;
  loraUrl?: string;
  loraStrength?: number;
}

export type RefRole =
  | "style"
  | "subject"
  | "palette"
  | "composition"
  | "pose";

export interface ImageRefNodeData extends BaseNodeData {
  kind: "imageRef";
  source: "upload" | "url";
  url?: string;
  dataUrl?: string;
  role?: RefRole;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface OutputNodeData extends BaseNodeData {
  kind: "output";
  text?: string;
  images?: string[];
}

export interface CompareNodeData extends BaseNodeData {
  kind: "compare";
  leftImage?: string;
  rightImage?: string;
  splitPercent?: number;
}

export interface ArrayNodeData extends BaseNodeData {
  kind: "array";
  items: string[];
}

export interface CriticNodeData extends BaseNodeData {
  kind: "critic";
  model: ClaudeModel;
  criteria: string;
  threshold: number;
  maxIterations: number;
  lastScore?: number;
  lastFeedback?: string;
  lastSuggestion?: string;
  iterations?: number;
}

export interface StyleAnchorReference {
  dataUrl: string;
  label?: string;
}

export interface StyleAnchorNodeData extends BaseNodeData {
  kind: "styleAnchor";
  references: StyleAnchorReference[];
  distillate?: string;
}

export type CanvasNodeData =
  | PromptNodeData
  | ImageGenNodeData
  | ImageRefNodeData
  | OutputNodeData
  | CompareNodeData
  | ArrayNodeData
  | CriticNodeData
  | StyleAnchorNodeData;

export type CanvasNode = Node<CanvasNodeData>;
export type CanvasEdge = Edge;

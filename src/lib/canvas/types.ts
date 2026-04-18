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

export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  status: NodeStatus;
  error?: string;
  cacheHit?: boolean;
}

export interface PromptNodeData extends BaseNodeData {
  kind: "prompt";
  model: ClaudeModel;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  output?: string;
}

export interface ImageGenNodeData extends BaseNodeData {
  kind: "imageGen";
  model: GeminiImageModel;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  outputImage?: string;
}

export interface ImageRefNodeData extends BaseNodeData {
  kind: "imageRef";
  source: "upload" | "url";
  url?: string;
  dataUrl?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface OutputNodeData extends BaseNodeData {
  kind: "output";
  text?: string;
  images?: string[];
}

export type CanvasNodeData =
  | PromptNodeData
  | ImageGenNodeData
  | ImageRefNodeData
  | OutputNodeData;

export type CanvasNode = Node<CanvasNodeData>;
export type CanvasEdge = Edge;

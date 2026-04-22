import "server-only";
import type { CanvasNode } from "@/lib/canvas/types";
import { detectParameters } from "@/lib/workflow/parameters";

export interface McpManifest {
  workflowId: string;
  workflowName: string;
  toolName: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: "string"; description: string }>;
    required: string[];
  };
}

const SAFE_NAME = /[^a-z0-9_-]/g;

export function toToolName(workflowName: string, workflowId: string): string {
  const slug = workflowName.toLowerCase().replace(SAFE_NAME, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (slug.length >= 3) return `prompt_canvas__${slug}`;
  return `prompt_canvas__${workflowId.replace(SAFE_NAME, "-")}`;
}

export function buildManifest(
  workflowId: string,
  workflowName: string,
  nodes: CanvasNode[]
): McpManifest {
  const params = detectParameters(nodes);
  const properties: McpManifest["inputSchema"]["properties"] = {};
  for (const p of params) {
    properties[p.name] = {
      type: "string",
      description: `Substituted into ${p.appearsIn.length} location${p.appearsIn.length === 1 ? "" : "s"} in the workflow.`,
    };
  }
  return {
    workflowId,
    workflowName,
    toolName: toToolName(workflowName, workflowId),
    description:
      `Run the "${workflowName}" workflow on the user's Prompt Canvas. ` +
      `Substitutes ${params.length} parameter${params.length === 1 ? "" : "s"} ` +
      `into a chain of Claude + Gemini nodes and returns the final output text and image URLs.`,
    inputSchema: {
      type: "object",
      properties,
      required: params.map((p) => p.name),
    },
  };
}

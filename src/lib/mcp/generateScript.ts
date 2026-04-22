import type { McpManifest } from "./manifest";

export interface GeneratedScript {
  filename: string;
  contents: string;
  configSnippet: string;
}

export function generateMcpScript(
  manifest: McpManifest,
  baseUrl: string
): GeneratedScript {
  const filename = `${manifest.toolName}.mjs`;
  const contents = `#!/usr/bin/env node
// Auto-generated MCP server for "${manifest.workflowName}".
// Bridges to a running Prompt Canvas via its /api/external/* command queue.
// Run via Claude Desktop / Cursor MCP config (see configSnippet below).
//
// Required env vars:
//   PROMPT_CANVAS_URL    e.g. https://xyz.trycloudflare.com (cloudflared tunnel URL)
//   PROMPT_CANVAS_SECRET same value as COWORK_API_SECRET in .env.local

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const URL_BASE = process.env.PROMPT_CANVAS_URL;
const SECRET = process.env.PROMPT_CANVAS_SECRET;
if (!URL_BASE || !SECRET) {
  console.error("PROMPT_CANVAS_URL and PROMPT_CANVAS_SECRET must be set");
  process.exit(1);
}

const WORKFLOW_ID = ${JSON.stringify(manifest.workflowId)};
const TOOL_NAME = ${JSON.stringify(manifest.toolName)};
const TOOL_DESCRIPTION = ${JSON.stringify(manifest.description)};
const INPUT_SCHEMA = ${JSON.stringify(manifest.inputSchema, null, 2)};

async function bridgeFetch(path, init = {}) {
  const headers = { ...(init.headers || {}), "X-Canvas-Secret": SECRET };
  if (init.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const res = await fetch(URL_BASE + path, { ...init, headers });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (json && json.error) || ("http " + res.status);
    throw new Error(msg);
  }
  return json;
}

async function enqueueAndWait(type, payload, timeoutMs = 600000) {
  const { commandId } = await bridgeFetch("/api/external/commands", {
    method: "POST",
    body: JSON.stringify({ type, payload }),
  });
  const startedAt = Date.now();
  let delay = 1000;
  while (true) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("command timed out after " + timeoutMs + "ms");
    }
    await new Promise((r) => setTimeout(r, delay));
    const cmd = await bridgeFetch("/api/external/commands/" + commandId);
    if (cmd.status === "done") return cmd.result;
    if (cmd.status === "error") throw new Error(cmd.error || "command failed");
    delay = Math.min(delay + 500, 3000);
  }
}

const server = new Server(
  { name: TOOL_NAME, version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: TOOL_NAME, description: TOOL_DESCRIPTION, inputSchema: INPUT_SCHEMA }],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== TOOL_NAME) {
    throw new Error("unknown tool: " + req.params.name);
  }
  const inputs = (req.params.arguments || {});
  const result = await enqueueAndWait("run_workflow_with_inputs", {
    workflowId: WORKFLOW_ID,
    inputs,
  });

  const blocks = [];
  blocks.push({
    type: "text",
    text:
      "Workflow \\"" + ${JSON.stringify(manifest.workflowName)} + "\\" finished. " +
      (result.ok ? "Success." : "Some nodes failed.") +
      (result.failed && result.failed.length ? " Failed: " + result.failed.join(", ") : "") +
      (result.skipped && result.skipped.length ? " Skipped: " + result.skipped.join(", ") : ""),
  });
  for (const out of result.outputs || []) {
    if (out.text) {
      blocks.push({ type: "text", text: "Output \\"" + out.label + "\\":\\n" + out.text });
    }
    if (out.images && out.images.length) {
      blocks.push({
        type: "text",
        text:
          "Output \\"" + out.label + "\\" produced " + out.images.length +
          " image(s). They are visible on the canvas; bytes were not transmitted to keep token cost low.",
      });
    }
  }
  return { content: blocks };
});

const transport = new StdioServerTransport();
await server.connect(transport);
`;

  const safeName = manifest.toolName.replace(/[^a-zA-Z0-9_-]/g, "");
  const configSnippet = JSON.stringify(
    {
      mcpServers: {
        [safeName]: {
          command: "node",
          args: [`/absolute/path/to/${filename}`],
          env: {
            PROMPT_CANVAS_URL: baseUrl,
            PROMPT_CANVAS_SECRET: "<same-as-COWORK_API_SECRET>",
          },
        },
      },
    },
    null,
    2
  );

  return { filename, contents, configSnippet };
}

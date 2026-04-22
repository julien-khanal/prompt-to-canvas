import type { CanvasNode } from "@/lib/canvas/types";

export interface WorkflowParameter {
  name: string;
  description: string;
  appearsIn: Array<{ nodeId: string; field: string }>;
}

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function detectParameters(nodes: CanvasNode[]): WorkflowParameter[] {
  const found = new Map<string, WorkflowParameter>();

  const consume = (
    nodeId: string,
    field: string,
    value: string | undefined
  ) => {
    if (!value) return;
    const matches = value.matchAll(PLACEHOLDER_RE);
    for (const m of matches) {
      const name = m[1];
      const existing = found.get(name);
      if (existing) {
        existing.appearsIn.push({ nodeId, field });
      } else {
        found.set(name, {
          name,
          description: `Used in node ${nodeId} (${field})`,
          appearsIn: [{ nodeId, field }],
        });
      }
    }
  };

  for (const n of nodes) {
    if (n.data.kind === "prompt") {
      consume(n.id, "prompt", n.data.prompt);
      consume(n.id, "systemPrompt", n.data.systemPrompt);
    } else if (n.data.kind === "imageGen") {
      consume(n.id, "prompt", n.data.prompt);
    } else if (n.data.kind === "array") {
      for (let i = 0; i < n.data.items.length; i++) {
        consume(n.id, `items[${i}]`, n.data.items[i]);
      }
    }
  }

  return [...found.values()];
}

export function applyParameters(
  nodes: CanvasNode[],
  values: Record<string, string>
): CanvasNode[] {
  const sub = (s: string | undefined): string | undefined => {
    if (!s) return s;
    return s.replace(PLACEHOLDER_RE, (_, name: string) => {
      const v = values[name];
      return v !== undefined ? v : `{{${name}}}`;
    });
  };

  return nodes.map((n) => {
    if (n.data.kind === "prompt") {
      return {
        ...n,
        data: {
          ...n.data,
          prompt: sub(n.data.prompt) ?? "",
          systemPrompt: sub(n.data.systemPrompt),
        },
      };
    }
    if (n.data.kind === "imageGen") {
      return {
        ...n,
        data: {
          ...n.data,
          prompt: sub(n.data.prompt) ?? "",
        },
      };
    }
    if (n.data.kind === "array") {
      return {
        ...n,
        data: {
          ...n.data,
          items: n.data.items.map((it) => sub(it) ?? ""),
        },
      };
    }
    return n;
  });
}

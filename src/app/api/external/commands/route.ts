import { NextRequest, NextResponse } from "next/server";
import { requireSecret } from "@/lib/cowork/auth";
import { commandQueue } from "@/lib/cowork/state";

export const runtime = "nodejs";

const KNOWN_TYPES = new Set([
  "generate",
  "patch_node",
  "run_node",
  "run_workflow",
  "abort_run",
  "create_workflow",
  "open_workflow",
  "list_workflows",
  "create_skill",
  "toggle_skill",
  "set_ref_image",
  "run_workflow_with_inputs",
  "describe_workflow_inputs",
  "list_skills",
  "delete_skill",
]);

export async function POST(req: NextRequest) {
  const auth = requireSecret(req);
  if (auth) return auth;
  let body: { type?: string; payload?: unknown };
  try {
    body = (await req.json()) as { type?: string; payload?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const type = (body.type ?? "").trim();
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
  if (!KNOWN_TYPES.has(type))
    return NextResponse.json(
      { error: `unknown command type "${type}". Known: ${[...KNOWN_TYPES].join(", ")}` },
      { status: 400 }
    );
  const cmd = commandQueue.enqueue(type, body.payload ?? {});
  return NextResponse.json({ commandId: cmd.id, status: cmd.status });
}

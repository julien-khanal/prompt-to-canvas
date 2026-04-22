import { NextRequest, NextResponse } from "next/server";
import { requireSecret } from "@/lib/cowork/auth";
import { commandQueue } from "@/lib/cowork/state";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireSecret(req);
  if (auth) return auth;
  const { id } = await params;
  let body: { ok?: boolean; result?: unknown; error?: string };
  try {
    body = (await req.json()) as { ok?: boolean; result?: unknown; error?: string };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const cmd = commandQueue.get(id);
  if (!cmd) return NextResponse.json({ error: "command not found" }, { status: 404 });
  if (body.ok === false) {
    commandQueue.fail(id, body.error ?? "unknown error");
  } else {
    commandQueue.complete(id, body.result ?? null);
  }
  return NextResponse.json({ ok: true });
}

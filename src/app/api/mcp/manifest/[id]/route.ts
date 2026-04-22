import { NextRequest, NextResponse } from "next/server";
import { requireSecret } from "@/lib/cowork/auth";
import { db } from "@/lib/db/schema";
import { buildManifest } from "@/lib/mcp/manifest";
import type { CanvasNode } from "@/lib/canvas/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireSecret(req);
  if (auth) return auth;
  const { id } = await params;
  const rec = await db().workflows.get(id);
  if (!rec) return NextResponse.json({ error: "workflow not found" }, { status: 404 });
  const manifest = buildManifest(rec.id, rec.name, rec.nodes as CanvasNode[]);
  return NextResponse.json(manifest);
}

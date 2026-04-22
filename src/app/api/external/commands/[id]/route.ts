import { NextRequest, NextResponse } from "next/server";
import { requireSecret } from "@/lib/cowork/auth";
import { commandQueue } from "@/lib/cowork/state";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireSecret(req);
  if (auth) return auth;
  const { id } = await params;
  const cmd = commandQueue.get(id);
  if (!cmd) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(cmd);
}

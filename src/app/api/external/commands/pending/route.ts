import { NextRequest, NextResponse } from "next/server";
import { requireSecret } from "@/lib/cowork/auth";
import { commandQueue } from "@/lib/cowork/state";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireSecret(req);
  if (auth) return auth;
  const url = new URL(req.url);
  const claim = url.searchParams.get("claim") !== "false";
  const pending = commandQueue.pending(claim);
  return NextResponse.json({ commands: pending });
}

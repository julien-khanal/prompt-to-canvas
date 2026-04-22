import { NextRequest, NextResponse } from "next/server";
import { requireSecret } from "@/lib/cowork/auth";
import { snapshotStore } from "@/lib/cowork/state";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireSecret(req);
  if (auth) return auth;
  const env = snapshotStore.get();
  if (!env) {
    return NextResponse.json(
      { error: "no snapshot — is the browser app open?" },
      { status: 404 }
    );
  }
  const ageMs = Date.now() - env.updatedAt;
  return NextResponse.json({ ...env, ageMs });
}

export async function POST(req: NextRequest) {
  const auth = requireSecret(req);
  if (auth) return auth;
  let body: { snapshot: unknown };
  try {
    body = (await req.json()) as { snapshot: unknown };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.snapshot) {
    return NextResponse.json({ error: "snapshot required" }, { status: 400 });
  }
  snapshotStore.set(body.snapshot);
  return NextResponse.json({ ok: true });
}

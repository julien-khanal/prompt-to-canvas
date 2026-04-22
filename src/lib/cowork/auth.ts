import "server-only";
import { NextResponse } from "next/server";

const HEADER_NAME = "x-canvas-secret";

export function requireSecret(req: Request): NextResponse | null {
  const expected = (process.env.COWORK_API_SECRET ?? "").trim();
  if (!expected) {
    return NextResponse.json(
      { error: "COWORK_API_SECRET env var not set on server" },
      { status: 503 }
    );
  }
  const provided = req.headers.get(HEADER_NAME)?.trim();
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

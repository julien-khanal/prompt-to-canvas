import { NextRequest, NextResponse } from "next/server";
import { requireSecret } from "@/lib/cowork/auth";
import { refStore } from "@/lib/cowork/state";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireSecret(req);
  if (auth) return auth;
  const { id } = await params;
  const ref = refStore.get(id);
  if (!ref) return NextResponse.json({ error: "not found or expired" }, { status: 404 });
  return new NextResponse(ref.buffer, {
    status: 200,
    headers: {
      "content-type": ref.mime,
      "content-length": String(ref.size),
      "cache-control": "private, max-age=60",
    },
  });
}

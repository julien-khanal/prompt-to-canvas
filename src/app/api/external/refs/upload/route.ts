import { NextRequest, NextResponse } from "next/server";
import { requireSecret } from "@/lib/cowork/auth";
import { refStore } from "@/lib/cowork/state";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = requireSecret(req);
  if (auth) return auth;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "form field 'file' missing" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (${file.size} > ${MAX_BYTES} bytes)` },
      { status: 413 }
    );
  }
  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "only image/* mime types accepted" }, { status: 415 });
  }
  const buffer = await file.arrayBuffer();
  const ref = refStore.put(buffer, mime);
  const baseUrl = req.nextUrl.origin;
  return NextResponse.json({
    refId: ref.id,
    url: `${baseUrl}/api/external/refs/${ref.id}`,
    mime: ref.mime,
    size: ref.size,
    expiresAt: ref.expiresAt,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";

/**
 * Persistent memory store for Cowork-style agents. Files live under
 *   ~/.prompt-canvas/memory/<sanitized-name>.md
 *
 * Convention:
 *   projects/<slug>.md   — per-project journals (e.g. "telekom-wm")
 *   domains/<slug>.md    — per-domain knowledge (e.g. "editorial-portraiture")
 *
 * Use the slash in the name to nest. We sanitize: no leading slash, no "..",
 * only [a-zA-Z0-9_/-]. Anything else is rejected.
 */

const MEMORY_ROOT = path.join(os.homedir(), ".prompt-canvas", "memory");
const SAFE_NAME_RE = /^[a-zA-Z0-9_/-]+$/;
const MAX_BODY_BYTES = 1_000_000; // 1 MB per file

function sanitizeName(raw: string): string | null {
  const cleaned = raw.trim().replace(/^\/+|\/+$/g, "");
  if (!cleaned) return null;
  if (cleaned.includes("..")) return null;
  if (!SAFE_NAME_RE.test(cleaned)) return null;
  return cleaned.endsWith(".md") ? cleaned : cleaned + ".md";
}

function pathFor(safeName: string): string {
  return path.join(MEMORY_ROOT, safeName);
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params;
  const safe = sanitizeName(decodeURIComponent(name));
  if (!safe)
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  const fp = pathFor(safe);
  try {
    const body = await fs.readFile(fp, "utf-8");
    const stat = await fs.stat(fp);
    return NextResponse.json({
      name: safe,
      body,
      bytes: body.length,
      updatedAt: stat.mtimeMs,
    });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      return NextResponse.json({
        name: safe,
        body: "",
        bytes: 0,
        updatedAt: null,
        notFound: true,
      });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params;
  const safe = sanitizeName(decodeURIComponent(name));
  if (!safe)
    return NextResponse.json({ error: "invalid name" }, { status: 400 });

  let body: { content?: unknown };
  try {
    body = (await req.json()) as { content?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content : null;
  if (content === null)
    return NextResponse.json({ error: "content required" }, { status: 400 });
  if (content.length > MAX_BODY_BYTES)
    return NextResponse.json(
      { error: `content too large (max ${MAX_BODY_BYTES} bytes)` },
      { status: 413 }
    );

  const fp = pathFor(safe);
  try {
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, content, "utf-8");
    return NextResponse.json({
      name: safe,
      bytes: content.length,
      written: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params;
  const safe = sanitizeName(decodeURIComponent(name));
  if (!safe)
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  const fp = pathFor(safe);
  try {
    await fs.unlink(fp);
    return NextResponse.json({ name: safe, deleted: true });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT")
      return NextResponse.json({ name: safe, deleted: false, notFound: true });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

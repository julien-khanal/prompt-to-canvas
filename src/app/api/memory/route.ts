import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";

const MEMORY_ROOT = path.join(os.homedir(), ".prompt-canvas", "memory");

interface MemoryEntry {
  name: string;
  bytes: number;
  updatedAt: number;
}

async function walk(dir: string, base = ""): Promise<MemoryEntry[]> {
  let entries: MemoryEntry[] = [];
  let dirents;
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") return [];
    throw err;
  }
  for (const d of dirents) {
    const full = path.join(dir, d.name);
    const rel = base ? `${base}/${d.name}` : d.name;
    if (d.isDirectory()) {
      entries = entries.concat(await walk(full, rel));
    } else if (d.isFile() && d.name.endsWith(".md")) {
      const stat = await fs.stat(full);
      entries.push({ name: rel, bytes: stat.size, updatedAt: stat.mtimeMs });
    }
  }
  return entries;
}

export async function GET() {
  try {
    const items = await walk(MEMORY_ROOT);
    items.sort((a, b) => b.updatedAt - a.updatedAt);
    return NextResponse.json({ root: MEMORY_ROOT, count: items.length, items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

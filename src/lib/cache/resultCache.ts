"use client";

import { db } from "@/lib/db/schema";
import { sha256Hex } from "./hash";

export interface TextResult {
  kind: "text";
  text: string;
}
export interface ImageResult {
  kind: "image";
  dataUrl: string;
  mime: string;
}
export type NodeResult = TextResult | ImageResult;

export async function hashFor(params: unknown): Promise<string> {
  return sha256Hex(params);
}

export async function getCached(hash: string): Promise<NodeResult | null> {
  const rec = await db().resultCache.get(hash);
  if (!rec) return null;
  return rec.result as NodeResult;
}

export async function putCached(hash: string, result: NodeResult): Promise<void> {
  const bytes =
    result.kind === "text"
      ? new TextEncoder().encode(result.text).length
      : estimateBase64Bytes(result.dataUrl);
  await db().resultCache.put({
    hash,
    result,
    createdAt: Date.now(),
    bytes,
  });
}

export async function clearCacheMatching(prefix: string): Promise<number> {
  const all = await db().resultCache.toArray();
  const toRemove = all.filter((r) => r.hash.startsWith(prefix));
  await db().resultCache.bulkDelete(toRemove.map((r) => r.hash));
  return toRemove.length;
}

export async function clearAllCache(): Promise<void> {
  await db().resultCache.clear();
}

function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

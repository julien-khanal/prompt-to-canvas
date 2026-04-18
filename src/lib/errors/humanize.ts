export function humanizeError(raw: string): string {
  if (!raw) return "Unknown error";
  const trimmed = raw.trim();

  // try to extract Google/Anthropic API error shape
  const jsonStart = trimmed.indexOf("{");
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(trimmed.slice(jsonStart));
      const msg = pickMessage(parsed);
      if (msg) return shortenRateLimit(msg);
    } catch {
      /* not JSON */
    }
  }

  return shortenRateLimit(trimmed).slice(0, 240);
}

function pickMessage(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  if (o.error && typeof o.error === "object") return pickMessage(o.error);
  return null;
}

function shortenRateLimit(msg: string): string {
  if (/quota|exceeded|rate limit|resource_exhausted/i.test(msg))
    return "Quota/rate limit exceeded — check plan & billing on the provider.";
  return msg;
}

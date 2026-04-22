export interface Suggestion {
  target: string;
  field: string;
  value: string;
  raw: string;
}

const SUGGESTION_RE =
  /<suggestion\s+target="([^"]+)"\s+field="([^"]+)"\s*>([\s\S]*?)<\/suggestion>/g;

export interface ParsedChatSegment {
  type: "text" | "suggestion";
  text?: string;
  suggestion?: Suggestion;
}

export function parseChatMessage(text: string): ParsedChatSegment[] {
  const segments: ParsedChatSegment[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(SUGGESTION_RE)) {
    const start = m.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, start) });
    }
    segments.push({
      type: "suggestion",
      suggestion: {
        target: m[1],
        field: m[2],
        value: m[3].trim(),
        raw: m[0],
      },
    });
    lastIndex = start + m[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }
  return segments;
}

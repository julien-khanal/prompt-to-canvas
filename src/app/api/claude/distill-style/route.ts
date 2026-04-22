import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const SYSTEM = `You are a visual style distiller. The user provides 3-14 reference images that share a visual identity (a brand shoot, a series, a moodboard). Your job: extract the shared visual DNA into a tight, generation-ready paragraph.

Output rules:
- 80-160 words.
- Plain paragraph, no headers, no bullets.
- Use cinematography and photography vocabulary: lighting direction and quality, color temperature, lens, depth of field, palette, materials, composition tendency.
- Identify the SHARED traits across the images, not what makes any single one special.
- Avoid generic adjectives ("beautiful," "stunning"). Use specific terms.
- If a brand color or material is consistent across images, name it.
- Do not describe individual images. Synthesize the across-the-set DNA.
- End with one sentence that says "When generating new images in this style: ..." giving an actionable directive.`;

interface DistillReq {
  apiKey: string;
  images: string[];
  existingDistillate?: string;
}

function parseDataUrl(url: string): { mime: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(url);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

export async function POST(req: NextRequest) {
  let body: DistillReq;
  try {
    body = (await req.json()) as DistillReq;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const apiKey = (body.apiKey ?? "").trim();
  if (!apiKey || apiKey === "sk-ant-placeholder")
    return NextResponse.json({ error: "Anthropic key missing" }, { status: 400 });
  if (!Array.isArray(body.images) || body.images.length === 0)
    return NextResponse.json({ error: "images required" }, { status: 400 });

  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
  const blocks: Anthropic.ContentBlockParam[] = [];

  blocks.push({
    type: "text",
    text:
      `Here are ${body.images.length} reference images that share a visual identity. ` +
      (body.existingDistillate
        ? `Previous distillate (refine it):\n${body.existingDistillate}\n\n`
        : "") +
      `Synthesize the shared visual DNA following the system rules.`,
  });

  for (const url of body.images.slice(0, 14)) {
    const parsed = parseDataUrl(url);
    if (!parsed) continue;
    if (!(allowed as readonly string[]).includes(parsed.mime)) continue;
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: parsed.mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
        data: parsed.data,
      },
    });
  }

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      temperature: 0.4,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: blocks }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return NextResponse.json({ distillate: text, usage: res.usage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    const status = err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

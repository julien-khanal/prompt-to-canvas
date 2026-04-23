import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ClaudeModel } from "@/lib/canvas/types";

export const runtime = "nodejs";

interface ClaudeExecuteReq {
  model: ClaudeModel;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  inputs?: Array<{ label: string; text: string }>;
  /** Upstream image data URLs (e.g. from imageGen / imageRef nodes). Each
   * is parsed and sent as a multimodal image block before the text prompt. */
  images?: string[];
  apiKey: string;
}

const ALLOWED_IMG_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function dataUrlToImageBlock(dataUrl: string): Anthropic.ImageBlockParam | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const media_type = m[1];
  const data = m[2];
  if (!ALLOWED_IMG_TYPES.has(media_type)) return null;
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: media_type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
      data,
    },
  };
}

export async function POST(req: NextRequest) {
  let body: ClaudeExecuteReq;
  try {
    body = (await req.json()) as ClaudeExecuteReq;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const apiKey = (body.apiKey ?? "").trim();
  if (!apiKey || apiKey === "sk-ant-placeholder")
    return NextResponse.json({ error: "Anthropic key missing" }, { status: 400 });
  if (!body.prompt?.trim())
    return NextResponse.json({ error: "empty prompt" }, { status: 400 });

  const client = new Anthropic({ apiKey });

  const inputsBlock =
    body.inputs && body.inputs.length
      ? `Upstream inputs:\n${body.inputs
          .map((i, idx) => `[${idx + 1}] ${i.label}:\n${i.text}`)
          .join("\n\n")}\n\nTask:\n`
      : "";

  const systemBlocks: Anthropic.TextBlockParam[] = body.systemPrompt?.trim()
    ? [
        {
          type: "text",
          text: body.systemPrompt.trim(),
          cache_control: { type: "ephemeral" },
        },
      ]
    : [];

  // Build user content. If we have upstream images, send multimodal blocks
  // (images first, then the text task). Otherwise send a plain string for
  // back-compat with the existing cache shape.
  const imageBlocks = (body.images ?? [])
    .map(dataUrlToImageBlock)
    .filter((b): b is Anthropic.ImageBlockParam => b !== null);

  const userContent: Anthropic.MessageParam["content"] =
    imageBlocks.length > 0
      ? [
          ...imageBlocks,
          { type: "text", text: `${inputsBlock}${body.prompt}` },
        ]
      : `${inputsBlock}${body.prompt}`;

  try {
    const isOpus = body.model === "claude-opus-4-7";
    const res = await client.messages.create({
      model: body.model,
      max_tokens: body.maxTokens ?? 1024,
      ...(isOpus ? {} : { temperature: body.temperature ?? 0.7 }),
      ...(systemBlocks.length ? { system: systemBlocks } : {}),
      messages: [{ role: "user", content: userContent }],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return NextResponse.json({ text, usage: res.usage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    const status = err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

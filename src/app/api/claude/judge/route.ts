import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ClaudeModel } from "@/lib/canvas/types";

export const runtime = "nodejs";

const JUDGE_SYSTEM = `You are an evaluator. The user gives you criteria and an artifact (text or image). Score the artifact 0–10 against the criteria, give one short paragraph of concrete feedback, and propose a single replacement prompt that, if used to regenerate the upstream artifact, would score higher.

Output STRICT JSON only — no prose, no markdown, no fences. Schema:
{
  "score": <0..10 integer>,
  "feedback": "<single paragraph, ≤350 chars>",
  "suggestedPrompt": "<the full replacement prompt, ≤800 chars>"
}

If the artifact already meets the criteria perfectly, set score: 10 and suggestedPrompt to the empty string.`;

interface JudgeReq {
  model: ClaudeModel;
  criteria: string;
  sourcePrompt: string;
  sourceText?: string;
  sourceImageDataUrl?: string;
  apiKey: string;
}

function parseDataUrl(url: string): { mime: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(url);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

export async function POST(req: NextRequest) {
  let body: JudgeReq;
  try {
    body = (await req.json()) as JudgeReq;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const apiKey = (body.apiKey ?? "").trim();
  if (!apiKey || apiKey === "sk-ant-placeholder")
    return NextResponse.json({ error: "Anthropic key missing" }, { status: 400 });
  if (!body.criteria?.trim())
    return NextResponse.json({ error: "criteria required" }, { status: 400 });

  const client = new Anthropic({ apiKey });
  const isOpus = body.model === "claude-opus-4-7";

  const userParts: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: `Criteria:\n${body.criteria.trim()}\n\nUpstream prompt that produced the artifact:\n${body.sourcePrompt}\n\nArtifact${body.sourceText ? " (text)" : body.sourceImageDataUrl ? " (image attached)" : ""}:`,
    },
  ];
  if (body.sourceText) {
    userParts.push({ type: "text", text: body.sourceText });
  }
  if (body.sourceImageDataUrl) {
    const parsed = parseDataUrl(body.sourceImageDataUrl);
    if (parsed) {
      const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
      if (!(allowed as readonly string[]).includes(parsed.mime)) {
        return NextResponse.json(
          { error: `unsupported image mime: ${parsed.mime}` },
          { status: 415 }
        );
      }
      userParts.push({
        type: "image",
        source: {
          type: "base64",
          media_type: parsed.mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
          data: parsed.data,
        },
      });
    }
  }

  try {
    const res = await client.messages.create({
      model: body.model,
      max_tokens: 600,
      ...(isOpus ? {} : { temperature: 0.2 }),
      system: [
        {
          type: "text",
          text: JUDGE_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userParts }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1)
      return NextResponse.json({ error: "judge returned non-JSON", raw: text }, { status: 502 });
    let parsed: { score?: number; feedback?: string; suggestedPrompt?: string };
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch (err) {
      return NextResponse.json(
        { error: "could not parse judge json", raw: text, detail: String(err) },
        { status: 502 }
      );
    }
    return NextResponse.json({
      score: typeof parsed.score === "number" ? Math.max(0, Math.min(10, parsed.score)) : null,
      feedback: parsed.feedback ?? "",
      suggestedPrompt: parsed.suggestedPrompt ?? "",
      usage: res.usage,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    const status = err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

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

/**
 * Try to extract a valid judge-shape object from Claude's reply. Models
 * occasionally wrap JSON in code fences, prepend "Here is the evaluation:",
 * or — when uncertain about an image — refuse with prose. Be forgiving:
 *   1. strip ``` fences and language tags
 *   2. take the first balanced { … } substring
 *   3. JSON.parse it; clamp score to [0, 10]
 * Returns null if no usable JSON could be extracted.
 */
function tryParseJudgeJson(
  text: string
): { score: number | null; feedback: string; suggestedPrompt: string } | null {
  if (!text) return null;

  let cleaned = text.trim();
  // Strip Markdown code fences if present.
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed: { score?: unknown; feedback?: unknown; suggestedPrompt?: unknown };
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }

  const rawScore = parsed.score;
  const score =
    typeof rawScore === "number" && Number.isFinite(rawScore)
      ? Math.max(0, Math.min(10, rawScore))
      : null;
  // If we got JSON but no usable score AND no feedback, it's not really a
  // judge response — let the soft-fail path handle it instead.
  if (score === null && !parsed.feedback) return null;

  return {
    score,
    feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
    suggestedPrompt:
      typeof parsed.suggestedPrompt === "string" ? parsed.suggestedPrompt : "",
  };
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
      // German feedback can be ~600 tokens alone; suggestedPrompt up to
      // 800 chars (~250 tokens). 2000 leaves comfortable headroom and
      // prevents the truncated-JSON-soft-fail observed on detailed
      // multi-criterion evaluations.
      max_tokens: 2000,
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

    const parseAttempt = tryParseJudgeJson(text);
    if (parseAttempt) {
      return NextResponse.json({ ...parseAttempt, usage: res.usage });
    }

    // SOFT-FAIL — if Claude refused / rambled / couldn't see the artifact,
    // return a deterministic shape with score=null and the raw response as
    // feedback. This lets the critic loop terminate gracefully (no hard
    // error on the node) instead of forcing the whole workflow to abort.
    return NextResponse.json({
      score: null,
      feedback: `judge could not return parseable JSON. Raw response: ${text.slice(0, 280)}${text.length > 280 ? "…" : ""}`,
      suggestedPrompt: "",
      usage: res.usage,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    const status = err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

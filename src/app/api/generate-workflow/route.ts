import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { WORKFLOW_SYSTEM_PROMPT, WORKFLOW_GENERATOR_VERSION } from "@/lib/workflow/systemPrompt";
import { extractJsonObject } from "@/lib/workflow/extractJson";
import { parseWorkflow } from "@/lib/workflow/schema";
import { applyGeneratorPolicies } from "@/lib/workflow/postProcess";
import { buildSkillSystemBlocks } from "@/lib/workflow/skillBlocks";
import type { Skill } from "@/lib/db/skills";

/**
 * Max output tokens for the generator. Big graphs (12+ nodes with rich
 * systemPrompts and criteria) can run 8-10k tokens of JSON. The previous
 * cap of 6000 truncated mid-graph on the FIFA WM iterative workflow.
 * Opus 4.7 supports up to 64k extended output; 16k gives comfortable
 * headroom for typical workflows without burning latency on impossibly
 * long graphs.
 */
const GENERATOR_MAX_TOKENS = 16000;

export const runtime = "nodejs";

interface GenerateReq {
  prompt: string;
  anthropicKey: string;
  skills?: Skill[];
}

export async function POST(req: NextRequest) {
  let body: GenerateReq;
  try {
    body = (await req.json()) as GenerateReq;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  const apiKey = (body.anthropicKey ?? process.env.ANTHROPIC_API_KEY ?? "").trim();

  if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  if (!apiKey || apiKey === "sk-ant-placeholder")
    return NextResponse.json(
      { error: "Anthropic API key missing. Add it in Settings." },
      { status: 400 }
    );

  const client = new Anthropic({ apiKey });

  try {
    const skillBlocks = buildSkillSystemBlocks(body.skills ?? []);
    const res = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: GENERATOR_MAX_TOKENS,
      system: [
        {
          type: "text",
          text: WORKFLOW_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
        ...skillBlocks,
      ],
      messages: [{ role: "user", content: prompt }],
    });

    if (res.stop_reason === "max_tokens") {
      // Note: previously blamed active skills here, which was misleading —
      // skills cost system-block tokens, not output tokens. The real cause
      // is graph size + per-node detail (systemPrompt, criteria, etc.).
      return NextResponse.json(
        {
          error: `Generator hit the ${GENERATOR_MAX_TOKENS}-token output cap mid-graph. The requested workflow is unusually large or detailed. Try one of: (a) split into two smaller workflows, (b) ask for fewer per-node details and patch them in afterwards, (c) reduce variant count.`,
        },
        { status: 502 }
      );
    }

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (!text) throw new Error("empty response from Claude");

    const jsonText = extractJsonObject(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      return NextResponse.json(
        {
          error: `Generator returned malformed JSON (${msg}). The first 500 chars: ${jsonText.slice(0, 500)}`,
        },
        { status: 502 }
      );
    }
    const workflow = applyGeneratorPolicies(parseWorkflow(parsed));

    return NextResponse.json({
      workflow,
      usage: res.usage,
      generatorVersion: WORKFLOW_GENERATOR_VERSION,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    const status =
      err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { WORKFLOW_SYSTEM_PROMPT, WORKFLOW_GENERATOR_VERSION } from "@/lib/workflow/systemPrompt";
import { extractJsonObject } from "@/lib/workflow/extractJson";
import { parseWorkflow } from "@/lib/workflow/schema";
import { buildSkillSystemBlocks } from "@/lib/workflow/skillBlocks";
import type { Skill } from "@/lib/db/skills";

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
      max_tokens: 6000,
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
      return NextResponse.json(
        {
          error:
            "Generator hit the output cap mid-graph. With multiple skills active the JSON can get long. Try a slightly simpler prompt or fewer active skills.",
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
    const workflow = parseWorkflow(parsed);

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

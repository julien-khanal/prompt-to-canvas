import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const SKILL_AUTHOR_SYSTEM = `You are a Skill Author for the Prompt Canvas tool. The user gives you a brief description of a knowledge area; you produce a single skill in this exact YAML+Markdown format and nothing else:

---
name: <kebab-case identifier, 2-4 words>
description: <one line, ≤120 chars, telling future-you when this skill applies>
---

<Markdown body. Be concrete and operational, not generic. Bullet lists, short sections.
Aim for 200-600 tokens. No fluff, no "as an AI" language.>

Skills augment a workflow generator that emits node graphs of Claude + Gemini calls. Your skill body should make the generator produce better-targeted graphs in the user's domain. Examples of useful skill content:
- Brand/CI rules (palette, tone, do's & don'ts)
- Domain knowledge (product categories, common compositions)
- Style preferences (preferred prompts, common variations)
- Constraints (always include X, never include Y)

Output only the YAML+Markdown — no commentary, no code fences around the whole thing.`;

interface DraftReq {
  goal: string;
  apiKey: string;
}

export async function POST(req: NextRequest) {
  let body: DraftReq;
  try {
    body = (await req.json()) as DraftReq;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const apiKey = (body.apiKey ?? "").trim();
  if (!apiKey || apiKey === "sk-ant-placeholder")
    return NextResponse.json({ error: "Anthropic key missing" }, { status: 400 });
  if (!body.goal?.trim())
    return NextResponse.json({ error: "goal is required" }, { status: 400 });

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      temperature: 0.6,
      system: [
        {
          type: "text",
          text: SKILL_AUTHOR_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: body.goal }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return NextResponse.json({ draft: text, usage: res.usage });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    const status = err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

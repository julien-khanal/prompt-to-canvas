import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Skill } from "@/lib/db/skills";
import { buildSkillContextForChat } from "@/lib/workflow/skillBlocks";

export const runtime = "nodejs";

const CHAT_SYSTEM_BASE = `You are the workflow advisor inside Prompt Canvas — a node-graph tool that chains Claude (text) and Gemini (image) calls.

Your job: help the user reason about the workflow they have on the canvas. Be concrete. Be brief. Refer to nodes by their label (in quotes) and id (in code) so the user can find them.

Rules:
1. Never mutate the workflow yourself. You only advise.
2. When you suggest a change to a specific node, format the suggestion as:
   <suggestion target="<node-id>" field="<prompt|model|temperature|aspectRatio|resolution|systemPrompt|label>">
   <new value goes here>
   </suggestion>
   The UI will render an "Apply to <node>" button under your suggestion. Use this format only when you have a concrete replacement value, not for vague advice.
3. For non-actionable advice, just write normally — no XML.
4. You may include short markdown (bold, lists, code blocks) but no headers larger than ###.
5. If you do not know something about the user's intent, ask one focused question rather than guessing.

The user will provide the current workflow as a JSON snapshot in their first message of each turn. Skills the user has activated are appended to this system prompt for additional domain context.`;

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface ChatReq {
  apiKey: string;
  model?: "claude-sonnet-4-6" | "claude-opus-4-7";
  skills?: Skill[];
  workflow: unknown;
  messages: ChatMsg[];
}

export async function POST(req: NextRequest) {
  let body: ChatReq;
  try {
    body = (await req.json()) as ChatReq;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const apiKey = (body.apiKey ?? "").trim();
  if (!apiKey || apiKey === "sk-ant-placeholder")
    return NextResponse.json({ error: "Anthropic key missing" }, { status: 400 });
  if (!body.messages?.length)
    return NextResponse.json({ error: "no messages" }, { status: 400 });

  const model = body.model ?? "claude-sonnet-4-6";
  const isOpus = model === "claude-opus-4-7";
  const client = new Anthropic({ apiKey });

  const skillContext = buildSkillContextForChat(body.skills ?? []);
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: CHAT_SYSTEM_BASE + skillContext,
      cache_control: { type: "ephemeral" },
    },
  ];

  const workflowMsg = `Current workflow snapshot:\n\n\`\`\`json\n${JSON.stringify(body.workflow, null, 2)}\n\`\`\``;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: workflowMsg },
    { role: "assistant", content: "Got it. What would you like to discuss about this workflow?" },
    ...body.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1200,
      ...(isOpus ? {} : { temperature: 0.5 }),
      system,
      messages,
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

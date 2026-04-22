"use client";

import { getKey } from "@/lib/crypto/keyring";
import { listActiveSkillsFor } from "@/lib/db/skills";
import { useCanvasStore } from "@/lib/canvas/store";
import { parseWorkflow, type Workflow } from "./schema";

export interface GenerateOk {
  ok: true;
  workflow: Workflow;
  usage?: unknown;
}
export interface GenerateErr {
  ok: false;
  error: string;
}
export type GenerateResult = GenerateOk | GenerateErr;

export async function generateWorkflowFromPrompt(prompt: string): Promise<GenerateResult> {
  const anthropicKey = await getKey("anthropic");
  if (!anthropicKey)
    return { ok: false, error: "Add your Anthropic API key in Settings." };

  const activeIds = useCanvasStore.getState().activeSkillIds;
  const skills = await listActiveSkillsFor(activeIds);

  try {
    const res = await fetch("/api/generate-workflow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, anthropicKey, skills }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? `http ${res.status}` };
    const workflow = parseWorkflow(json.workflow);
    return { ok: true, workflow, usage: json.usage };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network error" };
  }
}

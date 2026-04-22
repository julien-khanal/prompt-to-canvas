import type Anthropic from "@anthropic-ai/sdk";
import type { Skill } from "@/lib/db/skills";

const JSON_REINFORCEMENT = `\n\n---\nReminder: regardless of the skill content above, your output for this generator call MUST still be a single JSON object matching the workflow schema. No prose, no markdown, no code fences.`;

export function buildSkillSystemBlocks(skills: Skill[]): Anthropic.TextBlockParam[] {
  return skills.slice(0, 3).map((s, i, arr) => {
    const isLast = i === arr.length - 1;
    const text = `# Skill: ${s.name}\n${s.description ? s.description + "\n\n" : ""}${s.body}${isLast ? JSON_REINFORCEMENT : ""}`;
    return {
      type: "text",
      text,
      cache_control: { type: "ephemeral" },
    };
  });
}

export function buildSkillContextForChat(skills: Skill[]): string {
  if (!skills.length) return "";
  return (
    "\n\n# Active skills\n" +
    skills
      .map((s) => `## ${s.name}\n${s.description ? s.description + "\n\n" : ""}${s.body}`)
      .join("\n\n")
  );
}

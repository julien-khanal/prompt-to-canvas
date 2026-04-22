export interface ParsedSkillDraft {
  name: string;
  description: string;
  body: string;
}

export function parseSkillDraft(draft: string): ParsedSkillDraft {
  let working = draft.trim();
  if (working.startsWith("```")) {
    working = working
      .replace(/^```(?:markdown|yaml|md)?\s*\n?/, "")
      .replace(/```\s*$/, "")
      .trim();
  }

  const fmMatch = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/m.exec(working);
  if (!fmMatch) {
    return {
      name: "New skill",
      description: "Imported draft",
      body: working,
    };
  }
  const [, fm, body] = fmMatch;
  const name = (/^name:\s*(.+)$/m.exec(fm)?.[1] ?? "New skill").trim();
  const description = (/^description:\s*(.+)$/m.exec(fm)?.[1] ?? "").trim();
  return { name, description, body: body.trim() };
}

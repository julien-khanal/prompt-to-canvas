"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/field";
import { getKey } from "@/lib/crypto/keyring";
import { createSkill } from "@/lib/db/skills";
import { parseSkillDraft } from "@/lib/skills/parseDraft";
import { humanizeError } from "@/lib/errors/humanize";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Telekom CI rules: magenta palette, voice, logo placement",
  "Zooplus pet product photography: clean, natural light, animals optional",
  "Cinematic moodboard style: shallow depth, golden hour, anamorphic",
];

export function SkillWizard({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [goal, setGoal] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedName, setParsedName] = useState("");
  const [parsedDescription, setParsedDescription] = useState("");
  const [parsedBody, setParsedBody] = useState("");

  const reset = () => {
    setGoal("");
    setDraft(null);
    setError(null);
    setParsedName("");
    setParsedDescription("");
    setParsedBody("");
  };

  const onGenerate = async () => {
    if (!goal.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const apiKey = await getKey("anthropic");
      if (!apiKey) {
        setError("Add your Anthropic API key in Settings.");
        return;
      }
      const res = await fetch("/api/skills/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), apiKey }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `http ${res.status}`);
        return;
      }
      const parsed = parseSkillDraft(json.draft as string);
      setDraft(json.draft as string);
      setParsedName(parsed.name);
      setParsedDescription(parsed.description);
      setParsedBody(parsed.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    await createSkill({
      name: parsedName.trim() || "New skill",
      description: parsedDescription.trim(),
      body: parsedBody.trim(),
      enabled: true,
      alwaysOn: false,
    });
    reset();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="!max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <span className="text-gradient-primary">Author skill with Claude</span>
          </DialogTitle>
          <DialogDescription>
            Describe what knowledge this skill should carry. Sonnet drafts the body — you review and save.
          </DialogDescription>
        </DialogHeader>

        {!draft && (
          <div className="space-y-3">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="E.g. Telekom CI: brand colors, voice, do's & don'ts. Use for any Telekom workflow."
              rows={4}
              className="nowheel w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] focus:border-[var(--color-g-blue)]/60 focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-text-faint)]">
              <span>Example seeds:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setGoal(ex)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-[2px] hover:bg-white/[0.07] hover:text-[var(--color-text)]"
                >
                  {ex.slice(0, 38)}…
                </button>
              ))}
            </div>
          </div>
        )}

        {draft && (
          <div className="space-y-4">
            <Field label="Name">
              <input
                value={parsedName}
                onChange={(e) => setParsedName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] focus:border-[var(--color-g-blue)]/60 focus:outline-none"
              />
            </Field>
            <Field label="Description">
              <input
                value={parsedDescription}
                onChange={(e) => setParsedDescription(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] focus:border-[var(--color-g-blue)]/60 focus:outline-none"
              />
            </Field>
            <Field label="Body (Markdown)">
              <textarea
                value={parsedBody}
                onChange={(e) => setParsedBody(e.target.value)}
                rows={12}
                className="nowheel w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[12px] leading-relaxed focus:border-[var(--color-g-blue)]/60 focus:outline-none"
              />
            </Field>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-[var(--color-g-red)]/30 bg-[var(--color-g-red)]/10 px-3 py-2 text-[12px] text-[var(--color-g-red)]">
            {humanizeError(error)}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!draft ? (
            <Button onClick={onGenerate} disabled={loading || goal.trim().length < 4}>
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
                  Drafting
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3" strokeWidth={2.2} />
                  Draft with Claude
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Try again
              </Button>
              <Button onClick={onSave}>
                <Sparkles className="h-3 w-3" strokeWidth={2.2} />
                Save skill
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5")}>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
        {label}
      </div>
      {children}
    </div>
  );
}

"use client";

import { Pin, Plus } from "lucide-react";
import { useSkills } from "@/lib/hooks/useSkills";
import { MAX_ENABLED_SKILLS } from "@/lib/db/skills";
import { cn } from "@/lib/utils";

export function SkillChips({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { skills, toggle } = useSkills();
  if (!skills.length) {
    return (
      <button
        onClick={onOpenLibrary}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-[var(--color-text-faint)] transition-colors hover:border-white/20 hover:bg-white/[0.04] hover:text-[var(--color-text-dim)]"
      >
        <Plus className="h-3 w-3" strokeWidth={2.2} />
        Add skill
      </button>
    );
  }

  const enabledCount = skills.filter((s) => s.enabled || s.alwaysOn).length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {skills.map((s) => {
        const isOn = s.enabled || s.alwaysOn;
        const blocked = !isOn && enabledCount >= MAX_ENABLED_SKILLS;
        return (
          <button
            key={s.id}
            onClick={() => {
              if (blocked) return;
              if (s.alwaysOn) {
                onOpenLibrary();
                return;
              }
              void toggle(s.id, !s.enabled);
            }}
            title={
              s.alwaysOn
                ? `${s.name} · pinned (always-on) — open library to unpin`
                : blocked
                  ? `Limit ${MAX_ENABLED_SKILLS} — disable another first`
                  : isOn
                    ? `Click to disable: ${s.description}`
                    : `Click to enable: ${s.description}`
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] tracking-tight transition-all",
              isOn
                ? "border-transparent bg-gradient-primary text-white shadow-glow-blue"
                : blocked
                  ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-[var(--color-text-faint)] opacity-50"
                  : "border-white/10 bg-white/[0.03] text-[var(--color-text-dim)] hover:bg-white/[0.07] hover:text-[var(--color-text)]"
            )}
          >
            {s.alwaysOn && <Pin className="h-2.5 w-2.5" strokeWidth={2.4} />}
            {s.name}
          </button>
        );
      })}
      <button
        onClick={onOpenLibrary}
        title="Open skills library"
        className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-text-faint)] transition-colors hover:bg-white/[0.05] hover:text-[var(--color-text)]"
      >
        <Plus className="h-3 w-3" strokeWidth={2.2} />
      </button>
    </div>
  );
}

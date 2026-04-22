"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Pin,
  PinOff,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { useSkills } from "@/lib/hooks/useSkills";
import { estimateTokens, MAX_ENABLED_SKILLS, type Skill } from "@/lib/db/skills";

type Mode = "list" | "edit" | "wizard";

export function SkillsModal({
  open,
  onOpenChange,
  onOpenWizard,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenWizard: (initialGoal?: string) => void;
}) {
  const { skills, create, update, remove, toggle } = useSkills();
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(
    () => skills.find((s) => s.id === editingId) ?? null,
    [editingId, skills]
  );

  useEffect(() => {
    if (open) setMode("list");
  }, [open]);

  const enabledCount = skills.filter((s) => s.enabled || s.alwaysOn).length;

  const startNew = async () => {
    const sk = await create({
      name: "New skill",
      description: "Describe when this skill applies.",
      body: "Add knowledge or rules here…",
      enabled: false,
      alwaysOn: false,
    });
    setEditingId(sk.id);
    setMode("edit");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? (
              <button
                onClick={() => setMode("list")}
                className="inline-flex items-center gap-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-gradient-primary">Skills</span>
              </button>
            ) : (
              <span className="text-gradient-primary">Skills library</span>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Edit this skill. Markdown body is sent as a cached system block."
              : `Reusable knowledge cards. Up to ${MAX_ENABLED_SKILLS} can be active at once for efficient prompt caching. Currently active: ${enabledCount}.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "list" ? (
          <SkillList
            skills={skills}
            onEdit={(id) => {
              setEditingId(id);
              setMode("edit");
            }}
            onToggle={async (id, on) => {
              if (on && enabledCount >= MAX_ENABLED_SKILLS) {
                const skill = skills.find((s) => s.id === id);
                if (skill && !skill.alwaysOn) {
                  alert(
                    `You can have at most ${MAX_ENABLED_SKILLS} skills active at once. Disable one first.`
                  );
                  return;
                }
              }
              await toggle(id, on);
            }}
            onPin={async (id, alwaysOn) => {
              if (alwaysOn && enabledCount >= MAX_ENABLED_SKILLS) {
                alert(`Already ${MAX_ENABLED_SKILLS} active. Disable one first.`);
                return;
              }
              await update(id, { alwaysOn });
            }}
            onDelete={remove}
          />
        ) : (
          editing && (
            <SkillEditor
              skill={editing}
              onSave={async (patch) => {
                await update(editing.id, patch);
                setMode("list");
              }}
              onCancel={() => setMode("list")}
            />
          )
        )}

        {mode === "list" && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="ghost" onClick={() => onOpenWizard()}>
              <Wand2 className="h-3 w-3" strokeWidth={2.2} />
              Author with Claude
            </Button>
            <Button onClick={startNew}>
              <Plus className="h-3 w-3" strokeWidth={2.4} />
              Blank skill
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SkillList({
  skills,
  onEdit,
  onToggle,
  onPin,
  onDelete,
}: {
  skills: Skill[];
  onEdit: (id: string) => void;
  onToggle: (id: string, on: boolean) => void;
  onPin: (id: string, alwaysOn: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (!skills.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[12px] text-[var(--color-text-faint)]">
        No skills yet. Author one with Claude or start blank.
      </div>
    );
  }

  return (
    <ul className="nowheel max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
      {skills.map((s) => {
        const isOn = s.enabled || s.alwaysOn;
        return (
          <li
            key={s.id}
            className={cn(
              "group flex items-start gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
              isOn
                ? "border-[var(--color-g-blue)]/40 bg-white/[0.05]"
                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
            )}
          >
            <button
              onClick={() => onPin(s.id, !s.alwaysOn)}
              title={s.alwaysOn ? "Unpin (no longer always-on)" : "Pin as always-on"}
              className={cn(
                "mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full transition-colors",
                s.alwaysOn
                  ? "bg-gradient-primary text-white shadow-glow-blue"
                  : "text-[var(--color-text-faint)] hover:bg-white/[0.06] hover:text-[var(--color-text)]"
              )}
              aria-label={s.alwaysOn ? "Unpin" : "Pin"}
            >
              {s.alwaysOn ? (
                <Pin className="h-3 w-3" strokeWidth={2} />
              ) : (
                <PinOff className="h-3 w-3" strokeWidth={2} />
              )}
            </button>
            <button
              onClick={() => onEdit(s.id)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-[13px] font-medium">{s.name}</div>
              <div className="truncate text-[11px] text-[var(--color-text-faint)]">
                {s.description}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--color-text-faint)]">
                <span>~{estimateTokens(s.body)} tok</span>
                <span>·</span>
                <span>edited {new Date(s.updatedAt).toLocaleDateString()}</span>
              </div>
            </button>
            <div className="flex items-center gap-1.5">
              <Toggle
                checked={isOn}
                disabled={s.alwaysOn}
                onChange={(v) => onToggle(s.id, v)}
              />
              <button
                onClick={() => onDelete(s.id)}
                aria-label="Delete"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-faint)] opacity-0 transition-opacity hover:bg-[var(--color-g-red)]/10 hover:text-[var(--color-g-red)] group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked
          ? "bg-gradient-primary shadow-glow-blue"
          : "bg-white/[0.08]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-md transition-all",
          checked ? "left-[18px]" : "left-0.5"
        )}
      >
        {checked && <Sparkles className="h-2.5 w-2.5 text-[var(--color-g-blue)]" strokeWidth={2.4} />}
      </span>
    </button>
  );
}

function SkillEditor({
  skill,
  onSave,
  onCancel,
}: {
  skill: Skill;
  onSave: (patch: Partial<Skill>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(skill.name);
  const [description, setDescription] = useState(skill.description);
  const [body, setBody] = useState(skill.body);

  useEffect(() => {
    setName(skill.name);
    setDescription(skill.description);
    setBody(skill.body);
  }, [skill.id, skill.name, skill.description, skill.body]);

  return (
    <div className="space-y-4">
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] focus:border-[var(--color-g-blue)]/60 focus:outline-none"
        />
      </Field>
      <Field label="Description" hint="One line, used to remind you when it applies">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] focus:border-[var(--color-g-blue)]/60 focus:outline-none"
        />
      </Field>
      <Field label="Body (Markdown)" hint={`~${estimateTokens(body)} tokens`}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="nowheel w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[12px] leading-relaxed focus:border-[var(--color-g-blue)]/60 focus:outline-none"
        />
      </Field>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave({ name, description, body })}>Save</Button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
          {label}
        </div>
        {hint && (
          <div className="text-[10.5px] text-[var(--color-text-faint)]">{hint}</div>
        )}
      </div>
      {children}
    </div>
  );
}

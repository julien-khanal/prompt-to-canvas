"use client";

import { useState } from "react";
import {
  AlertCircle,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { generateWorkflowFromPrompt } from "@/lib/workflow/client";
import { workflowToCanvas } from "@/lib/workflow/mapToCanvas";
import {
  StructuredForm,
  buildStructuredPrompt,
  EMPTY_STRUCTURED,
  type StructuredValues,
} from "./StructuredForm";
import { SkillChips } from "./SkillChips";
import { GenerateConfirmDialog, type ConfirmChoice } from "./GenerateConfirmDialog";
import { humanizeError } from "@/lib/errors/humanize";
import { createWorkflow, setLastOpened } from "@/lib/db/workflows";

type Mode = "free" | "structured";

export function PromptBox({ onOpenSkills }: { onOpenSkills: () => void }) {
  const [mode, setMode] = useState<Mode>("free");
  const [value, setValue] = useState("");
  const [structured, setStructured] = useState<StructuredValues>(EMPTY_STRUCTURED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const replaceGraph = useCanvasStore((s) => s.replaceGraph);
  const setWorkflow = useCanvasStore((s) => s.setWorkflow);
  const currentName = useCanvasStore((s) => s.workflowName);
  const currentNodeCount = useCanvasStore((s) => s.nodes.length);

  const canSubmit = !loading && (mode === "free"
    ? value.trim().length > 3
    : structured.goal.trim().length > 3);

  const submit = async () => {
    if (!canSubmit) return;
    if (currentNodeCount > 0) {
      setConfirmOpen(true);
      return;
    }
    await runGenerate("replace");
  };

  const runGenerate = async (choice: "replace" | "new") => {
    setLoading(true);
    setError(null);
    const prompt =
      mode === "free" ? value.trim() : buildStructuredPrompt(structured);
    const result = await generateWorkflowFromPrompt(prompt);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    try {
      const { nodes, edges } = await workflowToCanvas(result.workflow);
      if (mode === "structured" && structured.refs.length) {
        let i = 0;
        for (const n of nodes) {
          if (n.data.kind === "imageRef" && i < structured.refs.length) {
            const url = structured.refs[i++];
            (n.data as { source: "url" | "upload"; dataUrl?: string; url?: string }).source = "upload";
            (n.data as { dataUrl?: string }).dataUrl = url;
          }
        }
      }
      if (choice === "new") {
        const fresh = await createWorkflow(deriveWorkflowName(prompt));
        await setLastOpened(fresh.id);
        setWorkflow(fresh.id, fresh.name, nodes, edges);
      } else {
        replaceGraph(nodes, edges);
      }
      setValue("");
      setStructured(EMPTY_STRUCTURED);
    } catch (err) {
      setError(err instanceof Error ? err.message : "layout failed");
    } finally {
      setLoading(false);
    }
  };

  const onConfirm = (choice: ConfirmChoice) => {
    setConfirmOpen(false);
    if (choice === "cancel") return;
    void runGenerate(choice);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey && mode === "free") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <>
    <GenerateConfirmDialog
      open={confirmOpen}
      currentName={currentName}
      nodeCount={currentNodeCount}
      onChoose={onConfirm}
    />
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto fixed bottom-6 left-1/2 z-30 w-[calc(100%-3rem)] max-w-3xl -translate-x-1/2"
    >
      <div className="mb-2 flex justify-center">
        <SkillChips onOpenLibrary={onOpenSkills} />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mb-2 flex items-center gap-2 rounded-2xl border border-[var(--color-g-red)]/30 bg-[var(--color-g-red)]/10 px-3.5 py-2 text-[12px] text-[var(--color-g-red)]"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-none" />
            <span className="flex-1" title={error}>{humanizeError(error)}</span>
            <button onClick={() => setError(null)} className="text-[10px] uppercase tracking-wider opacity-70 hover:opacity-100">
              dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "glass relative flex flex-col gap-2 px-3 py-2.5",
          mode === "free" ? "rounded-full" : "rounded-3xl"
        )}
      >
        <div className="flex items-center gap-3">
          <ModeToggle mode={mode} onChange={setMode} disabled={loading} />
          <AnimatePresence mode="wait" initial={false}>
            {mode === "free" ? (
              <motion.input
                key="free"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={loading}
                placeholder="Describe your workflow in natural language…"
                className="flex-1 bg-transparent px-2 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none disabled:opacity-70"
              />
            ) : (
              <motion.div
                key="structured-heading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-1 flex-col justify-center px-2 leading-tight"
              >
                <span className="text-[13px] font-medium text-[var(--color-text)]">
                  Structured brief
                </span>
                <span className="text-[11px] text-[var(--color-text-faint)]">
                  Fields below compose the prompt for the generator.
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <SubmitButton disabled={!canSubmit} loading={loading} onClick={submit} />
        </div>

        <AnimatePresence initial={false}>
          {mode === "structured" && (
            <motion.div
              key="structured-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-2 pb-1">
                <StructuredForm
                  value={structured}
                  onChange={setStructured}
                  disabled={loading}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <p className="mt-2.5 text-center text-[11px] tracking-wide text-[var(--color-text-faint)]">
        {mode === "free"
          ? "Enter to generate · Natural-language brief · Claude Opus 4.7 + prompt caching"
          : "Click submit to generate · Structured brief · Fields replace the free prompt"}
      </p>
    </motion.div>
    </>
  );
}

function deriveWorkflowName(prompt: string): string {
  const trimmed = prompt.trim().split("\n")[0];
  const truncated = trimmed.length > 48 ? trimmed.slice(0, 48) + "…" : trimmed;
  return truncated || "Untitled";
}

function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1 rounded-full bg-white/[0.04] p-1", disabled && "opacity-60")}>
      <ToggleBtn active={mode === "free"} onClick={() => onChange("free")} label="Free prompt" disabled={disabled}>
        <Wand2 className="h-3.5 w-3.5" />
      </ToggleBtn>
      <ToggleBtn active={mode === "structured"} onClick={() => onChange("structured")} label="Structured" disabled={disabled}>
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </ToggleBtn>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed",
        active
          ? "bg-gradient-primary text-white shadow-glow-blue"
          : "text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)]"
      )}
    >
      {children}
    </button>
  );
}

function SubmitButton({
  disabled,
  loading,
  onClick,
}: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-primary text-white shadow-glow-blue transition-transform hover:scale-[1.04] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Generate workflow"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
      ) : (
        <Sparkles className="h-4 w-4" strokeWidth={2} />
      )}
    </button>
  );
}

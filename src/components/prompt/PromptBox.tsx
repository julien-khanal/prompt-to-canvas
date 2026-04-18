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

type Mode = "free" | "structured";

export function PromptBox() {
  const [mode, setMode] = useState<Mode>("free");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { replaceGraph } = useCanvasStore();

  const canSubmit = value.trim().length > 3 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const result = await generateWorkflowFromPrompt(value.trim());
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    try {
      const { nodes, edges } = await workflowToCanvas(result.workflow);
      replaceGraph(nodes, edges);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "layout failed");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto fixed bottom-6 left-1/2 z-30 w-[calc(100%-3rem)] max-w-3xl -translate-x-1/2"
    >
      <AnimatePresence>
        {error && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mb-2 flex items-center gap-2 rounded-2xl border border-[var(--color-g-red)]/30 bg-[var(--color-g-red)]/10 px-3.5 py-2 text-[12px] text-[var(--color-g-red)]"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-[10px] uppercase tracking-wider opacity-70 hover:opacity-100">
              dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "glass relative flex items-center gap-3 px-3 py-2.5 transition-[border-radius] duration-300",
          mode === "free" ? "rounded-full" : "rounded-3xl"
        )}
      >
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
              placeholder="Describe your workflow…"
              className="flex-1 bg-transparent px-2 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none disabled:opacity-70"
            />
          ) : (
            <motion.div
              key="structured"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 items-center px-2 text-[15px] text-[var(--color-text-faint)]"
            >
              Structured mode — fields coming in Phase 6
            </motion.div>
          )}
        </AnimatePresence>

        <SubmitButton disabled={!canSubmit} loading={loading} onClick={submit} />
      </div>

      <p className="mt-2.5 text-center text-[11px] tracking-wide text-[var(--color-text-faint)]">
        Enter to generate · Workflows run on Claude Opus 4.7 with prompt caching
      </p>
    </motion.div>
  );
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
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-white shadow-glow-blue transition-transform hover:scale-[1.04] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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

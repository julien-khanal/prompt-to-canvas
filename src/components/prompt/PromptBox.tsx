"use client";

import { useState } from "react";
import { Sparkles, SlidersHorizontal, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Mode = "free" | "structured";

export function PromptBox() {
  const [mode, setMode] = useState<Mode>("free");
  const [value, setValue] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto fixed bottom-6 left-1/2 z-30 w-[calc(100%-3rem)] max-w-3xl -translate-x-1/2"
    >
      <div
        className={cn(
          "glass relative flex items-center gap-3 px-3 py-2.5 transition-[border-radius] duration-300",
          mode === "free" ? "rounded-full" : "rounded-3xl"
        )}
      >
        <ModeToggle mode={mode} onChange={setMode} />

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
              placeholder="Describe your workflow…"
              className="flex-1 bg-transparent px-2 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
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

        <SubmitButton />
      </div>

      <p className="mt-2.5 text-center text-[11px] tracking-wide text-[var(--color-text-faint)]">
        Enter to generate · API keys required (Phase 3)
      </p>
    </motion.div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1">
      <ToggleBtn active={mode === "free"} onClick={() => onChange("free")} label="Free prompt">
        <Wand2 className="h-3.5 w-3.5" />
      </ToggleBtn>
      <ToggleBtn active={mode === "structured"} onClick={() => onChange("structured")} label="Structured">
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
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition-all",
        active
          ? "bg-gradient-primary text-white shadow-glow-blue"
          : "text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)]"
      )}
    >
      {children}
    </button>
  );
}

function SubmitButton() {
  return (
    <button
      disabled
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-white shadow-glow-blue transition-transform hover:scale-[1.04] active:scale-95 disabled:opacity-70"
      aria-label="Generate workflow"
    >
      <Sparkles className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

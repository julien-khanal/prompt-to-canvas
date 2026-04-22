"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, FilePlus, Replace, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmChoice = "replace" | "new" | "cancel";

export function GenerateConfirmDialog({
  open,
  currentName,
  nodeCount,
  onChoose,
}: {
  open: boolean;
  currentName: string;
  nodeCount: number;
  onChoose: (choice: ConfirmChoice) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => onChoose("cancel")}
          />
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6"
          >
            <button
              onClick={() => onChoose("cancel")}
              aria-label="Cancel"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-faint)] transition-colors hover:bg-white/5 hover:text-[var(--color-text)]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-1.5 text-[18px] font-medium tracking-tight">
              <span className="text-gradient-primary">Generate workflow</span>
            </div>
            <div className="mb-5 text-[13px] leading-relaxed text-[var(--color-text-dim)]">
              You already have <span className="text-[var(--color-text)]">{nodeCount} {nodeCount === 1 ? "node" : "nodes"}</span> on{" "}
              <span className="text-[var(--color-text)]">"{currentName}"</span>. Pick what should happen.
            </div>

            <div className="space-y-2">
              <ChoiceRow
                accent="primary"
                title="Open in new workflow"
                desc="Recommended. Keep the current workflow as-is. The new graph opens in a fresh workflow."
                icon={<FilePlus className="h-4 w-4" strokeWidth={1.8} />}
                onClick={() => onChoose("new")}
              />
              <ChoiceRow
                accent="warn"
                title="Replace current workflow"
                desc={`Overwrites "${currentName}". You can still ⌘Z to undo within this session.`}
                icon={<Replace className="h-4 w-4" strokeWidth={1.8} />}
                onClick={() => onChoose("replace")}
              />
            </div>

            <div className="mt-5 flex items-center justify-end">
              <button
                onClick={() => onChoose("cancel")}
                className="rounded-full px-3 py-1.5 text-[12px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ChoiceRow({
  accent,
  title,
  desc,
  icon,
  onClick,
}: {
  accent: "primary" | "warn";
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all",
        accent === "primary"
          ? "border-[var(--color-g-blue)]/30 bg-white/[0.04] hover:bg-white/[0.07] hover:border-[var(--color-g-blue)]/50"
          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 flex-none items-center justify-center rounded-full",
          accent === "primary"
            ? "bg-gradient-primary text-white shadow-glow-blue"
            : "bg-white/[0.05] text-[var(--color-text-dim)]"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">{title}</div>
        <div className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--color-text-faint)]">
          {desc}
        </div>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 flex-none text-[var(--color-text-faint)] transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

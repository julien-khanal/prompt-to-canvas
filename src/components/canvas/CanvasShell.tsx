"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function CanvasShell() {
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <DotGrid />
      <TopBar />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-60 bg-gradient-primary"
              aria-hidden
            />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow-blue">
              <Sparkles className="h-6 w-6 text-white" strokeWidth={1.8} />
            </div>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-medium tracking-tight text-[var(--color-text)]">
              <span className="text-gradient-primary">Prompt Canvas</span>
            </h1>
            <p className="max-w-sm text-sm text-[var(--color-text-dim)]">
              Describe a workflow below — chain Claude and Gemini nodes into a runnable graph.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DotGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage:
          "radial-gradient(ellipse 70% 60% at 50% 50%, #000 40%, transparent 100%)",
      }}
    />
  );
}

function TopBar() {
  return (
    <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-gradient-primary shadow-glow-blue" />
        <span className="text-sm font-medium tracking-tight text-[var(--color-text-dim)]">
          prompt-canvas
        </span>
      </div>
      <button
        disabled
        className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs text-[var(--color-text-faint)] opacity-60"
      >
        Settings (soon)
      </button>
    </div>
  );
}

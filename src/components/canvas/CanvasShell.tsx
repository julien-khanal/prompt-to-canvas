"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Canvas } from "./Canvas";
import { SettingsModal } from "@/components/settings/SettingsModal";

export function CanvasShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Canvas />
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-4">
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-gradient-primary shadow-glow-blue" />
        <span className="text-sm font-medium tracking-tight text-[var(--color-text-dim)]">
          prompt-canvas
        </span>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          disabled
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-success px-4 py-1.5 text-xs font-medium text-white opacity-70"
        >
          Run (soon)
        </button>
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          className="glass inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
        >
          <Settings className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}

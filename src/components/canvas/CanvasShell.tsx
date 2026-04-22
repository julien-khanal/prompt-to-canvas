"use client";

import { useState } from "react";
import { BookMarked, FolderOpen, Loader2, Play, Settings } from "lucide-react";
import { Canvas } from "./Canvas";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { Inspector } from "@/components/inspector/Inspector";
import { DashboardModal } from "@/components/dashboard/DashboardModal";
import { SkillsModal } from "@/components/skills/SkillsModal";
import { SkillWizard } from "@/components/skills/SkillWizard";
import { useCanvasStore } from "@/lib/canvas/store";
import { useWorkflowPersistence } from "@/lib/hooks/useWorkflowPersistence";
import { runWorkflow } from "@/lib/executor/runWorkflow";
import { cn } from "@/lib/utils";

export function CanvasShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  useWorkflowPersistence();
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Canvas />
      <Inspector />
      <TopBar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDashboard={() => setDashboardOpen(true)}
        onOpenSkills={() => setSkillsOpen(true)}
      />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <DashboardModal open={dashboardOpen} onOpenChange={setDashboardOpen} />
      <SkillsModal
        open={skillsOpen}
        onOpenChange={setSkillsOpen}
        onOpenWizard={() => {
          setSkillsOpen(false);
          setWizardOpen(true);
        }}
      />
      <SkillWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => setSkillsOpen(true)}
      />
    </div>
  );
}

function TopBar({
  onOpenSettings,
  onOpenDashboard,
  onOpenSkills,
}: {
  onOpenSettings: () => void;
  onOpenDashboard: () => void;
  onOpenSkills: () => void;
}) {
  const isRunning = useCanvasStore((s) => s.isRunning);
  const hasNodes = useCanvasStore((s) => s.nodes.length > 0);
  const name = useCanvasStore((s) => s.workflowName);
  const setName = useCanvasStore((s) => s.setWorkflowName);
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-4">
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          onClick={onOpenDashboard}
          className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-white/[0.05]"
          aria-label="Open dashboard"
        >
          <div className="h-6 w-6 rounded-full bg-gradient-primary shadow-glow-blue" />
          <span className="text-sm font-medium tracking-tight text-[var(--color-text-dim)]">
            prompt-canvas
          </span>
        </button>
        <div className="h-4 w-px bg-white/10" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Workflow name"
          className="bg-transparent text-sm font-medium tracking-tight text-[var(--color-text)] focus:outline-none"
          size={Math.max(8, Math.min(name.length + 1, 40))}
        />
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onOpenDashboard}
          aria-label="Workflows"
          className="glass inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
        >
          <FolderOpen className="h-4 w-4" strokeWidth={1.7} />
        </button>
        <button
          onClick={onOpenSkills}
          aria-label="Skills"
          className="glass inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
        >
          <BookMarked className="h-4 w-4" strokeWidth={1.7} />
        </button>
        <button
          onClick={() => runWorkflow()}
          disabled={isRunning || !hasNodes}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50",
            "bg-gradient-success shadow-glow-blue hover:brightness-110 active:brightness-95"
          )}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
              Running
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current" strokeWidth={0} />
              Run
            </>
          )}
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

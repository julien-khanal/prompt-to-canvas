"use client";

import { useState } from "react";
import { BookMarked, FolderOpen, Loader2, MessageSquare, Play, Settings, Square, Undo2 } from "lucide-react";
import { Canvas } from "./Canvas";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { RightPanel } from "@/components/inspector/RightPanel";
import { DashboardModal } from "@/components/dashboard/DashboardModal";
import { SkillsModal } from "@/components/skills/SkillsModal";
import { SkillWizard } from "@/components/skills/SkillWizard";
import { PromptBox } from "@/components/prompt/PromptBox";
import { useCanvasStore } from "@/lib/canvas/store";
import { useWorkflowPersistence } from "@/lib/hooks/useWorkflowPersistence";
import { useUndoShortcut } from "@/lib/hooks/useUndoShortcut";
import { useNodeShortcuts } from "@/lib/hooks/useNodeShortcuts";
import { useCoworkBridge } from "@/lib/hooks/useCoworkBridge";
import { runWorkflow, abortWorkflowRun } from "@/lib/executor/runWorkflow";
import { cn } from "@/lib/utils";

export function CanvasShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  useWorkflowPersistence();
  useUndoShortcut();
  useNodeShortcuts();
  useCoworkBridge();
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Canvas />
      <RightPanel />
      <PromptBox onOpenSkills={() => setSkillsOpen(true)} />
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
  const setRightPanelTab = useCanvasStore((s) => s.setRightPanelTab);
  const rightPanelTab = useCanvasStore((s) => s.rightPanelTab);
  const canUndo = useCanvasStore((s) => s.history.length > 0);
  const undo = useCanvasStore((s) => s.undo);
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
          onClick={() => undo()}
          disabled={!canUndo}
          aria-label="Undo (Cmd+Z)"
          title={canUndo ? "Undo last change (⌘Z)" : "Nothing to undo"}
          className="glass inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" strokeWidth={1.7} />
        </button>
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
          onClick={() =>
            setRightPanelTab(rightPanelTab === "chat" ? null : "chat")
          }
          aria-label="Chat with workflow advisor"
          className={cn(
            "glass inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            rightPanelTab === "chat"
              ? "text-[var(--color-text)] ring-1 ring-[var(--color-g-blue)]/40"
              : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          )}
        >
          <MessageSquare className="h-4 w-4" strokeWidth={1.7} />
        </button>
        {isRunning ? (
          <button
            onClick={() => abortWorkflowRun()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-g-red)]/90 px-4 py-1.5 text-xs font-medium text-white shadow-[0_0_24px_-6px_rgba(234,67,53,0.5)] transition-all hover:bg-[var(--color-g-red)]"
          >
            <Square className="h-3 w-3 fill-current" strokeWidth={0} />
            Stop
          </button>
        ) : (
          <button
            onClick={() => runWorkflow()}
            disabled={!hasNodes}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50",
              "bg-gradient-success shadow-glow-blue hover:brightness-110 active:brightness-95"
            )}
          >
            <Play className="h-3 w-3 fill-current" strokeWidth={0} />
            Run
          </button>
        )}
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

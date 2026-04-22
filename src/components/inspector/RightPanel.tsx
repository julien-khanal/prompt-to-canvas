"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, SlidersHorizontal, X } from "lucide-react";
import { useCanvasStore } from "@/lib/canvas/store";
import { Inspector } from "./Inspector";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { cn } from "@/lib/utils";

export function RightPanel() {
  const tab = useCanvasStore((s) => s.rightPanelTab);
  const setTab = useCanvasStore((s) => s.setRightPanelTab);
  const nodes = useCanvasStore((s) => s.nodes);
  const selected = useMemo(() => nodes.find((n) => n.selected) ?? null, [nodes]);

  useEffect(() => {
    if (selected && tab !== "inspector") setTab("inspector");
  }, [selected?.id, tab, setTab, selected]);

  if (!tab) return null;

  return (
    <AnimatePresence>
      <motion.aside
        key="right-panel"
        initial={{ x: 24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 24, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto absolute right-4 top-20 bottom-32 z-20 flex w-[400px] flex-col overflow-hidden rounded-3xl"
      >
        <div className="glass flex h-full flex-col overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between gap-1 border-b border-white/5 px-2 py-1.5">
            <div className="flex items-center gap-0.5">
              <TabButton
                active={tab === "chat"}
                onClick={() => setTab("chat")}
                icon={<MessageSquare className="h-3.5 w-3.5" strokeWidth={1.8} />}
                label="Chat"
              />
              <TabButton
                active={tab === "inspector"}
                onClick={() => setTab("inspector")}
                icon={<SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.8} />}
                label="Inspector"
                disabled={!selected}
              />
            </div>
            <button
              onClick={() => setTab(null)}
              aria-label="Close panel"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-faint)] transition-colors hover:bg-white/[0.05] hover:text-[var(--color-text)]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {tab === "chat" && <ChatPanel />}
            {tab === "inspector" && (
              selected ? (
                <Inspector />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-[12px] text-[var(--color-text-faint)]">
                  Select a node on the canvas to inspect.
                </div>
              )
            )}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-white/[0.07] text-[var(--color-text)]"
          : "text-[var(--color-text-faint)] hover:bg-white/[0.04] hover:text-[var(--color-text-dim)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

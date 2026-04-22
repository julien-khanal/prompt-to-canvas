"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/lib/canvas/store";
import type { DisabledMode } from "@/lib/canvas/types";

export function useNodeShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || target.isContentEditable) return;
      }
      const key = e.key.toLowerCase();
      const ctrlMeta = e.metaKey || e.ctrlKey;
      if (!ctrlMeta) return;
      if (key !== "b" && key !== "m") return;

      const state = useCanvasStore.getState();
      const selected = state.nodes.filter((n) => n.selected);
      if (!selected.length) return;

      e.preventDefault();
      state.pushHistory(`Toggle ${key === "b" ? "bypass" : "mute"}`);

      const mode: DisabledMode = key === "b" ? "bypass" : "mute";
      for (const n of selected) {
        const next = n.data.disabled === mode ? undefined : mode;
        state.patchNodeData(n.id, { disabled: next });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

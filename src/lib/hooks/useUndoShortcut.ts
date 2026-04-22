"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/lib/canvas/store";

export function useUndoShortcut() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdZ =
        (e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey;
      if (!isCmdZ) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || target.isContentEditable) {
          return;
        }
      }
      e.preventDefault();
      useCanvasStore.getState().undo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

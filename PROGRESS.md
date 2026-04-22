# Progress

## Aktueller Stand
Phase: 12 (Power-User Controls)
Status: done
Letzter Commit: 12.4 Array + Variant fan-out

## Shipped in 12
- **12.1** Bypass / Mute pro Node — `disabled?: "bypass" | "mute"`. Bypass = Node skipped, Upstream wird durchgereicht. Mute = Node + downstream Branch tot. Toposort kennt Mute-Closure. Inspector-Toolbar (Bypass/Mute/Delete) + Keyboard-Shortcuts ⌘B / ⌘M (auch für Multi-Select). Visuelles Stripe-Pattern + Badge.
- **12.2** Compare-Node — neuer 5. Node-Typ `compare`. Zwei Image-Input-Handles (left/right). 16:10 Slider-Viewer, drag/click setzt Split-Position. Touch + Mouse. Auto-Sync von Upstream-Bildern via useEffect. Pure UI, keine Execution.
- **12.4** Array-Node + Variant-Fan-Out — neuer 6. Node-Typ `array`. Editierbare Item-Liste. Wenn an ImageGen verdrahtet, läuft ImageGen einmal pro Item ("Variant focus: ..."), Live-Progress-Anzeige, Cache pro Variant, Grid-Display in Output. Downstream-Konsumenten (Compare, Output) sehen alle Variants. Abort wird respektiert.

## Selbst-getestet
- `pnpm build` grün nach jedem Sub-Step (3 Commits)
- Dev-Server :3000 health: `GET / -> 200 (275 ms)`
- API-Error-Pfade unverändert: `/api/chat` ohne Key → `Anthropic key missing`
- Build erkennt alle 6 Node-Typen, neue Ressourcen (compare, array) korrekt im Bundle

## User-side Test-Plan
1. **Bypass:** Ein Node selektieren → ⌘B → Stripe-Overlay erscheint. Run → Node wird übersprungen, Upstream-Output wird als sein Output durchgereicht. ⌘B nochmal → zurück.
2. **Mute:** Ein Node selektieren → ⌘M → roter Stripe. Run → Node + downstream skipped. ⌘M nochmal → zurück.
3. **Compare-Node:** Toolbox → Compare A/B aufs Canvas droppen. Zwei ImageGen-Outputs auf die zwei left-Handles wiren. Slider draggen → Bilder werden überlagert.
4. **Array + Variants:** Toolbox → Variants array droppen. Items editieren ("cinematic", "studio", "flat-lay"). Auf ImageGen-Input wiren. ImageGen Run → 3 Bilder als Grid generiert. Output-Node zeigt alle 3.
5. **Cache pro Variant:** Variants-Run nochmal → CACHE-Chip erscheint, kein Gemini-Call.

## Offen (Tier 3, nicht blockend)
- "Modify existing workflow" Generator-Modus (12.3 vom User skipped, Phase 12.5 später möglich)
- Subgraph (collapse-to-node) wie ComfyUI Aug-2025
- App Mode (Workflow als shareable Form)
- Real-time canvas (Krea-Style)
- Region-Prompts mit Maske
- IndexedDB-Eviction-Policy

## Commits Phase 12
```
0d0f4c0 12.4 Array node + ImageGen variant fan-out
9311f8e 12.2 Compare node: drag-slider A/B viewer
ca1d629 12.1 Bypass / Mute on every node
```

## Resume
`claude` → `/model sonnet` → `PROGRESS.md` → falls Tier-3 oder "Modify-Generator" gewünscht.

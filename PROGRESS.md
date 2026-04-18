# Progress

## Aktueller Stand
Phase: 5b
Status: done
Letzter Commit: Phase-5b (direkt unten)

## Nächster Schritt
Phase 6: Structured-Prompt-Mode (Ziel, Bildreferenzen-Upload, Stil-Presets, Zielmodell, Aspect, Varianten), Model-Dropdowns inline in Nodes (Select), Motion-Polish (ELK-Re-Layout nach Generate + `fitView`, Edge-Particles via Custom-Edge statt default-animated, Node-Entry-Stagger).

## Offene Punkte
- Echter End-to-End-Test steht (Keys sind eingetippt): Canvas sollte mit Run einen Flow durchziehen. Falls Gemini-Response-Format abweicht, Route `/api/gemini/execute` anpassen.
- Preview-MCP ist global auf `telekom-dev` gelockt — lokal via `pnpm dev` manuell testen.
- Custom-Edge mit Flow-Particles (Gemini-Signature) steht noch aus — Phase 6 Polish.

## Entscheidungen in dieser Session
- **Store-Erweiterung**: `isRunning`-Flag, `setEdgesAnimated(ids, bool)`, `resetRunStatuses()` (setzt Nodes außer `imageRef` auf idle, clear error/edges-animated), `setRunning(v)`.
- **`runWorkflow`** (`src/lib/executor/runWorkflow.ts`): Kahn's-Toposort → Layers. Vor Lauf: `resetRunStatuses`, setzt `isRunning=true`. Pro Layer: `Promise.all` (parallele Execution). Pro Node: Upstream-Fail-Check (wenn ein Source im `failed`-Set → Status error "upstream failed", skipped); sonst incoming-Edges animated=true, `executeNode(id)`, finally animated=false. Output: `{ok, skipped, failed}`.
- **TopBar Run-Button**: funktional, Gradient-Success, Loader + "Running"-Label bei `isRunning`, disabled wenn running oder keine Nodes.
- **Edge-Animation**: React-Flow-Default `animated` Prop (gestrichelter Flow). Custom-SVG-Particles kommt in Phase 6.
- Cycle-Safety: wenn Toposort einen Rest hat (Cycle), werden die Übrigen als letzter Layer angehängt und laufen mit — pragmatisch statt strict-fail. Kann in Phase 6 strenger werden.

## Resume
Nächste Session: `claude` → `/model sonnet` → `PROGRESS.md` → **Phase 6** (Structured-Prompt, Model-Dropdowns, Motion-Polish, Custom Particle-Edges).

# Progress

## Aktueller Stand
Phase: 2
Status: done
Letzter Commit: f483bbe (Phase 1) — Phase-2-Commit folgt

## Nächster Schritt
Phase 3: Settings-Modal + IndexedDB-Persistence via Dexie + AES-GCM-Verschlüsselung für API-Keys (Anthropic + Gemini), Gear-Icon top-right aktiviert.

## Offene Punkte
- Preview-MCP greift konsistent den falschen Server (telekom-dev) — Smoke-Tests laufen via `pnpm build` (TS + static gen grün). Für visuelle Reviews: `cd prompt-canvas && pnpm dev` manuell.
- Run-Button + Settings-Button sind im TopBar platziert, aber disabled (aktiv ab Phase 5 / 3)
- API-Keys weiterhin Platzhalter (.env.local)

## Entscheidungen in dieser Session
- Canvas-State via Zustand-Store (`useCanvasStore`): `nodes`, `edges`, `onNodesChange/onEdgesChange/onConnect`, `replaceGraph`, `patchNodeData`, `setNodeStatus`
- Node-Typen-Hierarchie: `BaseNode` (glass-card, gradient header-stripe, sparkle-badge, StatusDot mit animated ping bei running, cache-chip, left/right Handles) + 4 Specialisierungen (`PromptNode`, `ImageGenNode`, `ImageRefNode`, `OutputNode`)
- Edges: SVG-linearGradient `#edge-gradient` (blue→purple→coral), 1.5 px
- Dot-Grid-Background (28 px, white/18%) + bestehender Radial-Ambient
- `nodeTypes`-Map in `src/components/nodes/index.ts`
- Seed-Graph: Prompt → ImageGen ← ImageRef → Output (auf Canvas-Init geladen, bleibt offline sinnvoll)

## Resume
Nächste Session: `claude` starten → `/model sonnet` → `PROGRESS.md` lesen → **Phase 3** starten (Dexie-Schema + AES-GCM-Wrapper + Settings-Modal).

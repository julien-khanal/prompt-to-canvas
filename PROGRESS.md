# Progress

## Aktueller Stand
Phase: 1
Status: done
Letzter Commit: (nach diesem Write folgt der Commit)

## Nächster Schritt
Phase 2: React Flow Canvas (Dot-Grid, Controls, Minimap, Zoom-Limits) + 4 Custom Node-Typen (Prompt, ImageGen, ImageRef, Output) — statisch, glass-style, Gradient-Header, Status-Indicator.

## Offene Punkte
- API-Keys (Platzhalter gesetzt) — echte Keys für Phase 3/4 nachreichen
- Preview-MCP hat fremden Server gegriffen; Smoke-Test stattdessen via `pnpm build` grün
- Next 16.2.4 statt Briefing-spezifiziertem Next 15 (Default-Install) — notiert, kein Konflikt erwartet
- `AGENTS.md` von create-next-app auto-generiert — bei Bedarf in Phase 7 entschlacken

## Entscheidungen in dieser Session
- Stack exakt wie Briefing §4
- Fonts: DM Sans / DM Mono
- Gemini-Palette als `@theme`-CSS-Vars in `globals.css`, Gradient-Utilities (`bg-gradient-primary|secondary|success`, `text-gradient-primary`, `glass`)
- shadcn-CLI skipped (interaktiv); `components.json` + `cn()`-Helper manuell angelegt — Radix / New-York / Lucide konfiguriert, zukünftige `shadcn add`-Calls funktionieren
- `@/*` → `src/*`; Component-Folders: `canvas`, `prompt`, (später `nodes`, `settings`, `ui`)
- Default-Modell Sonnet; Opus nur Plan + Workflow-Generator-Prompt + hartnäckiges Debug

## Resume
Nächste Session: `claude` starten → `/model sonnet` → `PROGRESS.md` lesen → weiter mit **Phase 2**.

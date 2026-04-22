# Progress

## Aktueller Stand
Phase: 9 (Skills + Chat) + 10 (Polish)
Status: done
Letzter Commit: 10 Polish

## Shipped in 9 (Skills + Chat)
- **9.1** Dexie v2 `skills` table + CRUD, MAX_ENABLED_SKILLS=3
- **9.2** Skills-Library-Modal (List, Edit, Toggle, Pin-als-always-on, Delete, Token-Schätzung)
- **9.3** Workflow-Generator: enabled Skills als zusätzliche cached System-Blocks. Letzter Skill-Block trägt JSON-Reinforcement.
- **9.4** Author-with-Claude Wizard (`/api/skills/draft`, Sonnet, strikter YAML+Markdown-Output, Draft → User reviews → Save)
- **9.5** Skill-Chips im PromptBox — Pin-Icon für always-on, on-the-fly toggle, blockiert über Limit.
- **9.6** RightPanel mit Tabs (Chat ⇄ Inspector), auto-switch zu Inspector bei Node-Selection
- **9.7** `/api/chat` — Sonnet default, Opus-Toggle, cached System-Prompt mit Skills, Workflow-Snapshot pro Turn als initial user message
- **9.8** Apply-Suggestion-Buttons — Claude kann `<suggestion target="..." field="...">value</suggestion>` emittieren, UI rendert Mini-Card mit "Apply to <node label>"-Button, patcht einzelne Felder (Conservative A)

## Shipped in 10 (Polish)
- **10.1** Glass-Deckkraft 55 % → 82 % (Text in Nodes lesbar). Zusätzliche `glass-soft`-Utility als Reserve.
- **10.2** ImageGen-Output-Override — im Inspector eigenes Bild hochladen, das ersetzt `outputImage`. Downstream-Nodes übernehmen via bestehender Pipeline automatisch. Auch "Skip generation" (Bild hochladen ohne je zu generieren).

## Offen (Post-MVP, nicht blockend)
- Custom-Edge mit Flow-Particles (default animated-Dashes funktional ausreichend)
- Provider-Swap-ENV (Kie.ai) für Gemini
- Streaming chat responses (Sonnet/Opus stream-mode, v2)
- Chat-Historie pro Workflow persistieren (aktuell session-only)
- Aggressive-Apply-Mode (strukturelle Workflow-Änderungen durch Chat)

## Entscheidungen Phase 9+10
- **Skills als cached System-Blocks** (nicht als separate User-Turn-Content): ermöglicht 0.1× Input-Kosten auf Re-Generates, ein Block pro Skill für granulare Cache-Hits
- **Hard-Limit 3 Skills** — Anthropic erlaubt 4 Cache-Breakpoints; einer geht an den base Generator-Prompt, drei an Skills. Limit klar kommuniziert.
- **"Pin" = always-on**, normaler Toggle = session-enabled. Pin-Icon visuell auf Chip + im Library-Modal.
- **Chat nutzt Sonnet default**, Opus-Toggle verfügbar aber nicht default (Kosten-Disziplin §3.2).
- **`<suggestion>`-XML-Format** statt strukturiertem Tool-Call — einfacher, klappt stabil, UI-seitig regex-parsebar.
- **Conservative-Apply only** in v1 — nur einzelne Felder (prompt/model/temperature/etc.), keine Struktur-Änderungen. Aggressiver Mode (Node hinzufügen/Edges umbauen) wäre v2.
- **Workflow-Snapshot** in jedem Chat-Turn neu schicken — Changes auf Canvas wirken sich sofort auf Chat-Antworten aus. Snapshot ist klein (~200-500 Tokens), Prompts auf 600 char getrimmt, keine base64 Bilder.
- **Glass-Opacity 82 %** statt 55 % — echter Trade-off zwischen Glass-Feeling und Lesbarkeit; 82 % ist die empirische Lesbarkeitsgrenze auf unserem Canvas-Hintergrund, noch mit sichtbarem Backdrop-Blur.
- **Output-Override schreibt direkt in `outputImage`** — kein neuer Code-Pfad, das gesamte bestehende Downstream-System (imageGen → downstream imageGen / output) zieht's ohne Änderung.

## Commits Phase 9+10
```
58652ee 10 Polish: glass opacity + ImageGen output override
(9.6-8) Chat panel with workflow-aware advisor + Apply buttons
19e84b7 9.5 Skill chips above the prompt box
(9.4)   Author-with-Claude skill wizard
666c6ec 9.3 Generator: append enabled skills as cached system blocks
(9.2)   Skills library modal
9ff6682 9.1 Skills storage: Dexie v2 schema + CRUD
```

## Resume
`claude` → `/model sonnet` → `PROGRESS.md` → falls Post-MVP-Arbeit gewünscht.

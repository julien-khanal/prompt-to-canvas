# Progress

## Aktueller Stand
Phase: 8 (Usability Pass)
Status: done
Letzter Commit: 8.6 Reference roles

## Shipped in 8
- **8.1** Drag-Stick gefixt — `nodrag/nopan/nowheel` statt `stopPropagation` auf interaktiven Children.
- **8.2** Mode-Klarheit — Free vs Structured mit sichtbaren Headern; Free-Input wird im Structured-Mode nicht verwendet.
- **8.3** Inspector-Panel (rechts) — editiert Label, Prompt, Model, Temperature (ausgegraut für Opus), Aspect, Resolution, System-Prompt, URL/Upload. "Reset cache" + "Run node" + "Delete node".
- **8.4** Toolbox (links) — 4 Node-Typen per Drag-n-Drop aufs Canvas.
- **8.5** Persistenz + Dashboard — Workflows auto-save (1.5 s debounced) in Dexie, Dashboard-Modal listet alle (open/rename/duplicate/delete/new), aktueller Name editierbar im TopBar, Reload restored last-opened.
- **8.6** Reference-Roles — ImageRef-Node hat `role: style | subject | palette | composition | pose`, Executor injiziert Role-Hints ("Reference 1 (Brand ref): use for style.") in den Gemini-Prompt.

## Offen (Post-MVP, nicht blockend)
- `docs/screenshot.png` befüllen
- Custom-Edge mit Flow-Particles (default animated-Dashes genügen funktional)
- Provider-Swap-ENV (Kie.ai)
- Opus-4.7-Text-Fallback (OpenAI)
- Edge-Level-Roles (aktuell Node-Level, einfacher und ausreichend)

## Entscheidungen Phase 8
- **Dashboard als Modal**, nicht als Route — kein Routing-Refactor nötig, Single-Page bleibt.
- **Auto-Save über Signatur-Vergleich** (name + node-count + edge-count + JSON-stringified nodes/edges). Kein Overkill-Diffing, aber verhindert leere Save-Loops.
- **Role auf ImageRef-Node**, nicht auf Edge — passt zum mentalen Modell ("dieses Bild ist meine Style-Referenz"), und erspart Edge-Selection-Handling im Inspector.
- **`.nowheel`** auf Inspector-Body + Dashboard-Liste — Scroll funktioniert inside, blockt Canvas-Zoom.

## Commits in Phase 8
```
8.1 Fix node drag-stick
8.2 Mode clarity
8.3 Inspector panel
8.4 Toolbox (drag to create)
8.5 Persistence + Dashboard
8.6 Reference roles on ImageRef
```

## Resume
`claude` → `/model sonnet` → `PROGRESS.md` → falls Post-MVP-Arbeit gewünscht. MVP + Usability-Pass beide shipbar.

# Progress

## Aktueller Stand
Phase: 14 + 15 + 16
Status: done
Letzter Commit: MCP-Refactor (browser-side generation)

## Shipped in 14 — MCP Tool Export
- `{{placeholder}}`-Detection in Prompts/Image-Prompts/Array-Items via `detectParameters()` + `applyParameters()` für Substitution
- Bridge-Commands `describe_workflow_inputs` und `run_workflow_with_inputs` — Workflow als parameterisierte Funktion ausführbar
- `runWorkflowOnGraph(nodes, edges)` als Executor-Entry-Point der den Store-Slot transient nutzt
- `buildManifest()` + `generateMcpScript()` (browser-side, weil Workflows in Dexie liegen) → produziert vollständige `.mjs` MCP-Server + Claude-Desktop-Config-Snippet
- `McpExportDialog` aus dem Dashboard erreichbar (Plug-Icon pro Workflow), Download-Button + Copy-to-Clipboard für Config
- Cowork-Skill + README Setup-Section dokumentiert

## Shipped in 15 — Reactive Canvas
- Toggle im TopBar (Radio-Icon, zeigt Live-Spend/Budget)
- `useReactiveCanvas` hook subscribed Store-Changes, berechnet pro Node eine "input signature" (nur Felder die wirklich Output beeinflussen)
- Bei Signature-Change: schedule executeNode für Node + alle Downstream-Runnables, debounced 1.8 s
- Cost-Ceiling: rolling 60-Sekunden-Counter, default 12 runs/min, Über-Limit-Runs werden silently dropped (kein Queueing-Hell)
- Manueller Full-Run cancelt pending reactive jobs
- Output-Felder/Status sind aus Signature ausgenommen → keine Run-triggert-Run-Loops

## Shipped in 16 — Critic / Goal-Seek
- Neuer Node-Typ `critic` (7. Typ): editierbare Criteria, Threshold (1-10), Max-Iterations (1-5), Judge-Model
- `/api/claude/judge` Route: multimodal (Text + Image), strict-JSON-Output mit `{score, feedback, suggestedPrompt}`, Cache auf System-Block
- Executor `runCritic` Loop: Source-Output → Judge → wenn Score < Threshold UND Iter < Max → patch Source.prompt mit Suggestion + cacheBust + executeNode(Source) + retry
- Inspector Critic-Body: Range-Sliders für Threshold + Max-Iter, Last-Result-Panel mit Score-Box + Feedback + Collapsible Suggested-Prompt
- Toolbox Eintrag (Gauge-Icon)

## Selbst-getestet
- `pnpm build` grün nach jedem Sub-Commit
- 14 API-Routes registriert (entfernt /api/mcp/* nach Refactor — Generation ist jetzt browser-side)
- Live-Test gegen Dev-Server mit echtem Secret:
  - `list_workflows` → korrekte Workflow-Liste mit Node-Counts
  - `describe_workflow_inputs` → leere parameters-Liste für Workflow ohne `{{var}}` (erwartet)
  - Reactive-Toggle + Critic-Toolbox in Build-Output verifiziert

## User-Test-Plan
1. **MCP-Export:** Dashboard öffnen → Workflow hover → Plug-Icon → Dialog. Wenn Workflow `{{var}}` enthält: Parameter erscheinen. Download `.mjs`, kopiere Config in `~/Library/Application Support/Claude/claude_desktop_config.json`, restart Claude Desktop, in Chat: tool sollte verfügbar sein.
2. **Reactive Mode:** TopBar Radio-Icon klicken → "Reactive ON" mit `0/12`. Im Inspector eines Concept-Prompt-Nodes Text ändern → 1.8 s später startet Re-Run der Concept-Node + downstream ImageGens. Counter steigt.
3. **Critic:** Toolbox → Gauge-Icon (Critic) aufs Canvas. Wire Output eines ImageGen-Nodes zu Critic. Inspector → Criteria z. B. "Score 0-10 wie gut das Bild zur Telekom-CI passt". Run Critic → Score erscheint, falls < 8: Suggestion patcht Concept-Prompt, Re-Run, neue Bewertung. Stoppt bei Threshold oder 3 Iter.

## Architektur-Dispatchung Punkte
- **Reactive + Critic** könnten gemeinsam zu Loop führen → Critic patcht Source.prompt → Reactive sieht Change → schedule. Aktuell: Reactive berücksichtigt cacheBust, also würde es triggern. Aber Reactive ist debounced 1.8 s und Critic-Iterationen laufen synchron innerhalb der Critic-Execution. In der Praxis kein Konflikt, weil Critic seinen eigenen executeNode-Call macht bevor Reactive triggern könnte. Watch this.
- **MCP-Skript** läuft als stdio-Server in Cowork's Sandbox-VM. Für externe Reachability muss cloudflared-URL in der Config statt `localhost` stehen — UI-Hint deckt das ab.
- **Critic für Image-Source:** sendet base64-DataURL an Claude (multimodal). Claude 4 sieht Bilder ab `image/png|jpeg|webp|gif`. Andere mimes → 415.

## Offen (Tier 4, nicht-blockend)
- Reactive-Mode-Tooltip mit Liste der queued nodes
- Critic könnte Score-History als Sparkline rendern (zeigt Verbesserung über Iterationen)
- MCP-Server-Generator als HTTP/SSE-Variante (statt nur stdio)
- Cost-Ceiling pro Workflow statt global
- Critic mit "human approval"-Gate vor jeder Auto-Patch (HITL aus n8n-Pattern)

## Commits Phase 14+15+16
```
Fix: MCP-Refactor (browser-side generation)
16  Critic node + goal-seek loop: self-improving workflows
15  Reactive Canvas: changes auto-rerun downstream (with cost cap)
14.5 README + Cowork SKILL.md updates for MCP export
14.3+14.4  MCP manifest endpoint + script generator + Export UI
14.1+14.2  Workflow parameters + run_workflow_with_inputs
```

## Resume
Test im Browser + Cowork. Falls etwas hakt, schick mir den Server-Log + UI-Screenshot.

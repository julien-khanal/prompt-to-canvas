# Progress

## Aktueller Stand
Phase: 11 (Safety & Robustness)
Status: done
Letzter Commit: 11.8 + 11.9

## Shipped in 11
- **11.1** Generate-Confirm-Dialog — bei Submit auf vollem Workflow: 3-Wege-Dialog (Open in new workflow / Replace / Cancel). "Open in new" auto-named aus Prompt. Fixt den ursprünglichen Datenverlust-Bug.
- **11.2** Undo-Stack — letzte 12 Snapshots, Cmd+Z global (außer in Inputs), TopBar-Undo-Button. `replaceGraph` und `removeNode` pushen automatisch eine History.
- **11.3** Orphan-Edge-Cleanup — `onNodesDelete` von React Flow ruft `removeOrphanEdgesFor`, Backspace + Delete beide aktiv, History wird gepusht.
- **11.4** Chat-Apply-Validation — `validateApply()` whitelistet patchbare Felder pro Node-Kind, prüft Enums (model/aspect/resolution/role) und Range (temperature 0–1). Bad Apply zeigt per-card-Error, kein silent corruption.
- **11.5** ImageGen-Output-Override-Flag — `outputOverride: boolean`. Executor short-circuit'tet wenn Flag gesetzt, kein API-Call. "Reset cache" und Clear-X unsetzen den Flag.
- **11.6** Output-Auto-Refresh — nach jedem erfolgreichen Prompt/ImageGen/ImageRef-Pass `refreshDownstreamOutputs()` walked downstream, ruft `propagateToOutput` für jeden erreichbaren Output-Node. Per-Node-Run aktualisiert Final automatisch.
- **11.7** Skills pro Workflow — `WorkflowRecord.activeSkillIds` persistiert. Switch zu anderem Workflow → Skills-Auswahl wechselt. Pinned/alwaysOn bleibt global.
- **11.8** Chat-History-Cap (16 Messages) — älteste Pair (User+Assistant) wird gedroppt sobald Limit überschritten. Token-Cost bleibt bounded.
- **11.9** Run-Abort — AbortController in `runWorkflow`, Signal an alle fetches in `executeNode`. Stop-Button (rot) ersetzt Run während `isRunning`. AbortError → Status zurück auf idle, kein "error" markiert.

## Selbst-getestet
- `pnpm build` grün nach jedem Sub-Step (alle 8 Commits)
- API-Error-Paths via `curl`:
  - `POST /api/chat` ohne Key → `{"error":"Anthropic key missing"}` ✅
  - `POST /api/generate-workflow` ohne Key → korrekter 400-Error ✅
  - `POST /api/chat` mit leerer messages → `{"error":"no messages"}` ✅
- HMR auf laufendem Dev-Server picked up alle Änderungen, mehrfach `GET / 200` bestätigt

## User-side Test-Plan (was ich nicht von Server-Seite verifizieren kann)
1. **Bug fix**: Workflow generieren, Settings öffnen, Bilder hochladen → erneut Prompt absetzen → Dialog "Open in new" wählen → originaler Workflow muss intakt bleiben (Dashboard öffnen → beide sichtbar)
2. **Undo**: Node löschen → ⌘Z → Node + Edges zurück
3. **Keyboard delete**: Node selektieren, Backspace → Edges verschwinden auch
4. **Chat-Apply**: Chat fragen "Welcher Model wäre besser für Variation A?" → Suggestion-Card mit Apply-Button → Klick → Modell ändert sich am Node
5. **Chat-Apply-Block**: Chat manuell "fake" suggestion mit field="kind" senden lassen → Error "cannot be applied"
6. **Output-Override**: ImageGen-Node Inspector → eigenes Bild hochladen → Run klicken → Cache-Chip erscheint, Gemini wird NICHT angerufen
7. **Output-Auto-Refresh**: Workflow mit Concept→ImageGen→Output, Run, dann Concept-Prompt ändern, Run am Concept allein → Output sollte den neuen Concept-Text consolidaten
8. **Skills pro Workflow**: 2 Workflows. In A skill X aktivieren, auf B switchen → X aus, Y aktivieren, zurück auf A → X wieder an
9. **Chat-Cap**: 20+ Chat-Turns → älteste verschwinden, kein Crash
10. **Run-Abort**: Workflow mit 3+ ImageGens starten, sofort Stop klicken → Run bricht sauber ab, Nodes status idle

## Offen (Tier 3, Post-MVP)
- IndexedDB-Quota-Eviction für Result-Cache
- Multi-Tab-Race-Conditions
- Chat-Compaction via Sonnet (statt Drop) bei sehr langen Sessions
- Edge-Selection / Edge-Inspector
- Generator-Timeout (kein Hänger bei langsamer API)
- Toolbox auf Touch-Devices (HTML5-Drag schwach)
- Result-Cache-Eviction-Policy (LRU + Bytes-Cap)

## Commits Phase 11
```
7998cdb 11.8 + 11.9 Chat history cap + Run abort
298938d 11.7 Skills active per workflow (not globally)
5e10ca1 11.5 + 11.6 ImageGen output override flag + downstream auto-refresh
99ad981 11.3 + 11.4 Orphan-edge cleanup + Chat-Apply validation
265cd8e 11.1 Generate-confirm dialog: stop silent workflow destruction
28adf8c 11.2 Undo stack + Cmd+Z + TopBar undo button
```

## Resume
`claude` → `/model sonnet` → `PROGRESS.md` → falls Tier-3-Robustness gewünscht.

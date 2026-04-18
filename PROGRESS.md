# Progress

## Aktueller Stand
Phase: 4
Status: done
Letzter Commit: Phase-4 (direkt unten)

## Nächster Schritt
Phase 5a: Single-Node-Execution. Text-Nodes rufen Claude (Sonnet default), Image-Nodes rufen Gemini (Pro/Flash). Ergebnis wird in `data.output` / `data.outputImage` geschrieben und im Node inline angezeigt. Result-Cache via IndexedDB (Hash: model + prompt + params).

## Offene Punkte
- Kein echter Test-Call möglich ohne echten Anthropic-Key (Platzhalter bricht im Route-Handler ab). Julien bitte echten Key in Settings einfügen + testen.
- Preview-MCP greift konsistent falschen Server; Smoke-Tests via `pnpm build`.
- Nach erfolgreichem Generate: React Flow `fitView` läuft nur auf erstem Mount. Option: `useReactFlow().fitView()` nach `replaceGraph` — Phase 6 Polish.
- `extractJsonObject`: naive `{...}`-Matching. Reicht weil Schema gestattet keine String-Fields mit "}". Bei Bedarf in Phase 6 robuster.

## Entscheidungen in dieser Session
- **System-Prompt** (`src/lib/workflow/systemPrompt.ts`, ~800 Zeilen Text, liegt klar über 1024 Tokens für Cache-Trigger). Versioniert via `WORKFLOW_GENERATOR_VERSION`. Enthält Hard Rules, Schema, Node-Catalog, Model-Routing-Leitlinien, Shape-Heuristiken, 3 Few-Shots (Textonly, Variationen-Fanout, Ref-basiertes Social-Post), Checklist.
- **Schema-Validator** (`schema.ts`): Manuelles `parseWorkflow` ohne zod (kein neuer Dep), validiert IDs, Referenzen, Enum-Werte. Wirft sprechend.
- **API-Route** (`/api/generate-workflow`, Node runtime): nimmt `{prompt, anthropicKey}`, ruft `claude-opus-4-7` mit `max_tokens: 2048`, `temperature: 0.4`, **`cache_control: ephemeral`** auf System-Block. Response wird via `extractJsonObject` → `JSON.parse` → `parseWorkflow` validiert. Usage + Version mit zurück.
- **ELK-Layout** (`layout.ts`): `layered`, Direction RIGHT, NETWORK_SIMPLEX, 90 px Layer-Abstand. ImageGen/Output bekommen 320 px Breite, rest 300.
- **Map-to-Canvas** (`mapToCanvas.ts`): pro Typ korrektes `CanvasNodeData` + ELK-Positionen.
- **Client** (`client.ts`): holt Key aus IndexedDB, postet an Route, parsed Antwort nochmal (defense in depth).
- **PromptBox**: echte Submit-Logik, Loading-Spinner, Error-Banner (dismissable), Enter-to-Submit, `canSubmit` bei min. 4 Zeichen. Nach Erfolg `replaceGraph` + Value clear.

## Resume
Nächste Session: `claude` → `/model sonnet` → `PROGRESS.md` lesen → **Phase 5a** starten (Node-Execution-Engine: Claude-Client für Prompt-Nodes, Gemini-Client für ImageGen-Nodes, Result-Cache, Inline-Preview).

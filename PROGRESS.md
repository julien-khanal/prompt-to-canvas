# Progress

## Aktueller Stand
Phase: 5a
Status: done
Letzter Commit: Phase-5a (direkt unten)

## Nächster Schritt
Phase 5b: Multi-Node-Chaining. Global "Run" im TopBar = topologischer Sort, sequenzielle Execution mit paralleler Fan-Out (Promise.all je Layer), Edge-Animation (Flow-Particles) während aktiver Kante.

## Offene Punkte
- Echte API-Tests stehen aus (Platzhalter-Keys). Julien: echten Anthropic-Key in Settings → Prompt absetzen → Generate → "Run" an einem prompt-Node → erwartet Text-Output inline.
- Gemini-SDK-Aufruf basiert auf `@google/genai` `generateContent` mit inlineData-Response. Falls SDK-Signatur abweicht: in Phase 5b verifizieren.
- Preview-MCP greift weiter falschen Server; Smoke-Test via `pnpm build`.
- Result-Cache hat noch kein Eviction (fließt in Phase 7 ein, falls nötig).

## Entscheidungen in dieser Session
- **Hash** (`src/lib/cache/hash.ts`): SHA-256 über stable-stringified params (sortierte Keys → deterministisch).
- **Result-Cache** (`src/lib/cache/resultCache.ts`): Dexie-`resultCache` liest/schreibt `NodeResult = TextResult | ImageResult`, speichert Bytes-Metadaten.
- **`/api/claude/execute`** (Node runtime): nimmt `{model, prompt, systemPrompt?, temperature, maxTokens?, inputs?, apiKey}`, optional Cached-System-Block (`cache_control: ephemeral`), Upstream-Inputs als `[label]: text`-Präfix im User-Turn. Default `max_tokens: 1024` (Briefing §3.3).
- **`/api/gemini/execute`** (Node runtime): `@google/genai` `generateContent` mit Text-Part + optionalen `inlineData`-RefImages, Aspect-Ratio + Target-Size als Prompt-Hint. Response parsed `candidates[0].content.parts[].inlineData`.
- **Executor** (`src/lib/executor/executeNode.ts`): Entry-Point `executeNode(nodeId)`. Sammelt Upstream-Inputs (Text + Images) aus Store, dispatcht nach `data.kind`:
  - `prompt` → Cache-Check → Route → `patchNodeData({output, status: done})`
  - `imageGen` → effectivePrompt = data.prompt + Upstream-Text → Cache-Check → Route → `outputImage`
  - `imageRef` → no-op (passthrough)
  - `output` → propagiert gesammelte Inputs (Text konkateniert, Images-Array) auf `data.text` / `data.images`
- **Per-Node Run-Button**: In `BaseNode` ein optionaler `runnable`-Flag + `error`-Prop → kleiner Gradient-Pill-Button im Footer ("Play"-Icon, Loader bei `status === running`, Click → `executeNode(id)`). Aktiv nur für Prompt/ImageGen-Nodes. Click stopPropagation, damit Drag nicht startet.
- **Status/Error-UI**: `error` wird als roter Glass-Chip zwischen Content und Footer angezeigt.
- Keine Opus-Calls für Node-Execution — Sonnet default, Haiku möglich wenn der Generator den Node so spezifiziert hat.

## Resume
Nächste Session: `claude` → `/model sonnet` → `PROGRESS.md` lesen → **Phase 5b** (topologischer Sort, globaler Run, Edge-Particles).

# Progress

## Aktueller Stand
Phase: 3
Status: done
Letzter Commit: Phase-3 (direkt unten)

## Nächster Schritt
Phase 4: Workflow-Generator. `/api/generate-workflow`-Route, cached System-Prompt (≥1024 T.) mit Node-Katalog + JSON-Schema + Few-Shots, Opus-4.7-Call, Response → Canvas via `replaceGraph`, Auto-Layout (ELK falls > 3 Nodes, Dagre sonst — oder ELK always, schlanker).

## Offene Punkte
- API-Keys für echten Call in Phase 4 nötig (Anthropic zuerst) — UI speichert jetzt bereits
- Preview-MCP greift falschen Server; Smoke-Test via `pnpm build`
- System-Prompt-Design ist Opus-Kernarbeit (§8.1 erlaubt), danach zurück auf Sonnet

## Entscheidungen in dieser Session
- **Dexie-Schema** (`src/lib/db/schema.ts`): Tables `keys` (id, ciphertext, iv, updatedAt), `workflows`, `resultCache` (hash-keyed), `meta`. DB nur browser-seitig instanziiert.
- **Crypto** (`src/lib/crypto/keyring.ts`): AES-GCM-256 mit PBKDF2-derived key. Master-Salt (16 B) liegt in `meta`-Tabelle, Fingerprint = `userAgent|lang|screenWxH|tz`, 120 k PBKDF2-Iterations, 12-B-IV per encrypt. API: `putKey/getKey/deleteKey/hasKey`.
- **`useApiKeys`-Hook** (`src/lib/hooks/useApiKeys.ts`): lädt `anthropic`/`gemini` beim Mount, `save/clear/refresh`. In-memory state hält aktuelle Werte + `set`-Flag.
- **UI-Primitives** (`src/components/ui/`): `Dialog` (Radix-Portal, Overlay mit Backdrop-Blur, glass-Container), `Input` / `Label` / `Hint` / `Button` (primary/ghost/danger).
- **SettingsModal** (`src/components/settings/SettingsModal.tsx`): zwei Key-Felder mit Show/Hide + Clear + "stored"-Indikator, AES-Hinweis, Save/Close. Gradient-Title.
- Gear-Icon im TopBar öffnet Modal (Canvas-Shell state)
- TS-5.9-Build forderte `BufferSource`-Casts für `Uint8Array` bei SubtleCrypto (einmaliger Fix, dokumentiert)

## Resume
Nächste Session: `claude` → `/model sonnet` → `PROGRESS.md` lesen → **Phase 4** starten. Für den Workflow-Generator-System-Prompt kurz auf Opus wechseln (Kernstück), danach zurück auf Sonnet.

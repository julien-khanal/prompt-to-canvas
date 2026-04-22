# Progress

## Aktueller Stand
Phase: 13 (Cowork Bridge)
Status: done
Letzter Commit: 13.6 README

## Shipped in 13
- **13.1+13.2** Server-Bridge: in-memory state (HMR-safe via globalThis Symbol), Snapshot-Endpoint (push+get), Command-Queue (enqueue/pending/get/result), Auth-Middleware mit `X-Canvas-Secret`-Header gegen `COWORK_API_SECRET`-env. TTL-Cleanup lazy alle 5 min.
- **13.4** Multipart-Upload: `POST /api/external/refs/upload` (image/* only, 12 MB max), `GET /api/external/refs/:id` streamt Bytes. 1 h TTL. Binär bleibt komplett aus dem LLM-Kontext.
- **13.3** Browser-Sync-Hook: pusht Snapshot debounced 500 ms, pollt Commands alle 2 s, dispatched zu 11 Command-Handlern (generate / patch_node / run_node / run_workflow / abort_run / create_workflow / open_workflow / list_workflows / create_skill / toggle_skill / set_ref_image). Settings-Modal kriegt "Cowork bridge secret"-Feld (localStorage).
- **13.5** `cowork-skill/SKILL.md` + `cowork-skill/README.md` — fertige drag-and-drop Skill-Datei mit komplettem Protokoll, Datenmodell, allen Command-Schemas, Patterns, Common-Mistakes.
- **13.6** README.md kriegt "Control from Claude Cowork" Setup-Section.

## End-to-end live verifiziert (11 Bridge-Tests)
- 401 ohne/mit falschem Secret ✓
- 503 wenn Server-Env fehlt ✓
- POST/GET snapshot ✓ (age in ms zurück)
- POST command → queued ✓
- GET pending mit claim → Status auf running ✓
- POST result → status done + result-Payload ✓
- GET command (terminal) → enthält completedAt ✓
- Unknown command type rejected mit Liste valider Types ✓
- Multipart-Upload byte-identisch (test PNG hin und zurück) ✓
- Mime-Reject (text/plain) ✓
- Browser-Sync-Hook compiled, läuft hinter Setting "Cowork bridge secret" gated

## Architektur-Disziplin (Lead-Dev-View)
- **Browser bleibt Source of Truth.** Server hält nur Cache + Queue. Kein State-Sync-Drama, kein Conflict-Resolution.
- **Auth ein einziger Header**, ein einziges Secret. Kein OAuth, kein JWT, kein Session-State.
- **In-memory** absichtlich gewählt: User-Setup ist Personal-Mac, Server-Restart bei `pnpm dev` kein Problem. Keine fremden Dependencies (Redis, etc.).
- **Multipart out-of-band** für Bilder — der wichtigste Token-Saver. 100 KB JPG würde sonst 130k Tokens kosten.
- **HMR-safe** via `globalThis[Symbol.for("...")]`. Sonst hätte jede Code-Änderung den Snapshot + Queue gekillt.
- **Whitelist-Pattern** für Command-Types und Patch-Felder — gleiche Defense wie Chat-Apply (Phase 11.4). Cowork kann keine Node-Internas korrumpieren.
- **`useCoworkBridge`** ist no-op wenn kein Secret in localStorage — kein Polling, keine Calls.

## Offen (nicht-blockend, Polish)
- Server-Sent-Events statt 2s-Polling (würde Latenz von 2 s auf <50 ms drücken; aktuell aber okay)
- Retry-Logic im Browser-Hook bei kurzzeitigem Netz-Drop
- Snapshot-Diffing damit nur Deltas gepusht werden (aktuell pusht der ganze Snapshot bei jeder Änderung)

## Commits Phase 13
```
13.6 README: Cowork setup section
13.5 SKILL.md + cowork-skill/README.md
13.3 Browser sync hook + dispatcher
13.4 Multipart image upload + serve
13.1+13.2 Server state + auth + snapshot/command endpoints
```

## Resume
Tunnel öffnen + Skill in Cowork installieren → testen.
```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
# Sekret kopieren aus .env.local (COWORK_API_SECRET)
# Drag cowork-skill/SKILL.md in Cowork-Skills-Library
# Cowork: "Was hab ich gerade in Prompt Canvas offen?" → erste Probe
```

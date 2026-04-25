# Rollback Guide

Dieses Dokument erklärt, wie du jede Änderung dieses Projekts rückgängig machen kannst,
falls eine neue Version sich nicht bewährt.

## Restore Points (git tags)

| Tag | Stand vor | Datum |
|---|---|---|
| `pre-karpathy-2026-04-23` | Karpathy-Stage-1 build (memory + agent vision + apply_workflow) | 2026-04-23 |

## Vollständiger Rollback eines Tags

```bash
cd ~/projects/prompt-canvas

# Browse the tag without committing (read-only):
git checkout pre-karpathy-2026-04-23

# Actually go back to that state:
git reset --hard pre-karpathy-2026-04-23

# Push the revert to GitHub (be sure first!):
git push --force-with-lease origin main

# After revert: re-sync skill files to Cowork's installed location
./scripts/sync-cowork-skills.sh

# Hard-reload Canvas-Tab im Browser
# Start a new Cowork chat (cached skill state)
```

## Granularer Rollback einzelner Layer (additive Architektur)

Alle Karpathy-Stage-1 Erweiterungen sind **additiv** — du kannst Layer einzeln deaktivieren ohne das Tool zu brechen.

### Memory-System ausschalten

Die Memory liegt unter `~/.prompt-canvas/memory/`. Cowork nutzt sie nur wenn explizit aufgerufen via `read_memory` / `write_memory` bridge commands.

```bash
# Komplett löschen
rm -rf ~/.prompt-canvas/memory

# Oder einzelne Files löschen
rm ~/.prompt-canvas/memory/projects/telekom-wm.md
rm ~/.prompt-canvas/memory/domains/editorial-portraiture.md
rm ~/.prompt-canvas/memory/domains/iterative-image-workflows.md
```

Die Bridge-Befehle bleiben verfügbar, returnieren aber `notFound: true` für gelöschte Files.

### Pro-Skills deaktivieren oder löschen

In der Canvas Settings UI:
1. Settings öffnen → Skills tab
2. "Image-Gen Prompt Engineer" und/oder "Iterative Refinement Strategist" auswählen
3. Toggle off (deaktivieren) oder Delete (komplett entfernen)

Alternativ via Bridge:
```
bridge.delete_skill({ name: "Image-Gen Prompt Engineer" })
bridge.delete_skill({ name: "Iterative Refinement Strategist" })
```

Existierende Workflows sind nicht betroffen — die Skills wurden NICHT auto-aktiviert.

### Bridge-Befehle nicht nutzen

Die neuen Befehle (`get_node_artifacts`, `read_memory`, `write_memory`, `list_memory`, `apply_workflow`) sind reine Erweiterungen. Wenn Cowork sie nicht aufruft, ändert sich nichts am Verhalten der bestehenden Befehle (`generate`, `patch_node`, `run_node`, etc.).

Falls du Cowork verbieten willst, sie zu nutzen: in `cowork-skill/SKILL.md` die Sektionen `## get_node_artifacts`, `## read_memory`, `## write_memory`, `## list_memory`, `## apply_workflow`, und `# Working pattern: agent-vision + memory loop` löschen, dann `./scripts/sync-cowork-skills.sh` ausführen + neuen Cowork-Chat starten.

### Cowork-Skill SKILL.md zurückrollen

```bash
# Hole die alte Version aus dem Tag und kopiere sie zurück
git show pre-karpathy-2026-04-23:cowork-skill/SKILL.md > cowork-skill/SKILL.md
./scripts/sync-cowork-skills.sh
# Neuer Cowork-Chat starten zum Cache-Reset
```

### Server-side Memory-Endpoints entfernen

Wenn du die `/api/memory/*` Routes komplett raushaben willst:

```bash
rm -rf src/app/api/memory
# Restart dev server:
launchctl kickstart -k gui/$(id -u)/de.julienkhanal.prompt-canvas
```

Das dispatcher-Aufrufe `read_memory`/`write_memory`/`list_memory` werden dann mit "memory read failed" / network-error returnen (graceful degradation).

## Bestätigen, dass alles wieder beim Alten ist

Nach einem Rollback prüfen:

```bash
# Git: bist du auf dem erwarteten Commit?
cd ~/projects/prompt-canvas && git log -1 --oneline

# Skills: nur die ursprünglichen 3?
curl -s -H "X-Canvas-Secret: 61f6313f3de94140b312bd25ab4a68a0" \\
     -H "ngrok-skip-browser-warning: 1" \\
     -X POST -H "Content-Type: application/json" \\
     -d '{"type":"list_skills","payload":{}}' \\
     https://debating-macarena-down.ngrok-free.dev/api/external/commands

# Memory: leer?
ls ~/.prompt-canvas/memory/ 2>/dev/null || echo "weg"

# Bridge: kennt die neuen Befehle nicht mehr?
curl -s -X POST -H "X-Canvas-Secret: 61f6313f3de94140b312bd25ab4a68a0" \\
     -H "ngrok-skip-browser-warning: 1" \\
     -H "Content-Type: application/json" \\
     -d '{"type":"get_node_artifacts","payload":{"nodeId":"x"}}' \\
     https://debating-macarena-down.ngrok-free.dev/api/external/commands
# erwartet: "unknown command type"
```

## Wenn etwas Unklares passiert

Im Zweifel: **`git reset --hard pre-karpathy-2026-04-23`** auf den lokalen Branch und `force-with-lease push`. Das ist die nukleare Option und stellt den Stand vor dem Build vollständig her. Memory-Files und Pro-Skills bleiben aber separat — die musst du wie oben beschrieben deaktivieren/löschen.

# Briefing: Prompt-to-Code Canvas Tool
**Zielplattform:** Claude Code mit Opus 4.7
**Autor:** Julien (Auftraggeber)
**Modus:** AI-First — Opus entscheidet autonom, Julien reviewed Ergebnisse

---

## 0. Warum Claude Code und nicht Cowork

| Kriterium | Cowork | Claude Code |
|---|---|---|
| Filesystem/Tools | Sandbox-VM, ~1.200 apt-Packages fix | Volle Freiheit: npm, pnpm, git, beliebige Packages |
| Ideal für | Research, Docs, File-Ops, Knowledge Work | Software-Bau, iterative Entwicklung, Custom Stacks |
| Token-Effizienz | Niedriger (Screenshots, Computer-Use-Overhead) | Höher (gezielte File-Edits, kein Bild-Roundtrip) |
| MCP/Skills | 131 vorinstallierte Connectors, 132 Skills | Beliebig erweiterbar via MCP, SKILL.md, AGENTS.md |
| Setup-Aufwand | Null | ~30–60 Min einmalig |

**Entscheidung: Claude Code.** Für ein Prompt-to-Code Tool mit React Flow Canvas, API-Proxy-Layer und iterativer UI-Arbeit ist Cowork strukturell ungeeignet. Die einmalige Setup-Investition zahlt sich ab Session 2 zurück.

---

## 1. Projektziel

Ein Web-basiertes Prompt-to-Workflow-Tool im Stil von Weavy/Figma Weave, mit dem Nutzer via Prompt einen ganzen Node-Workflow generieren lassen können. Der Workflow läuft auf Klick ab und verkettet KI-Modelle (Text + Bild) miteinander. Ästhetik: Gemini AI Visual Design Language (Gradienten, Rundungen, "warm spatial rounded", dark theme, sanfte Motion).

**Kern-UX:**
1. Infinite Canvas (zoom/pan/drag) mit Node-System und Edges
2. Prompt-Box fixiert unten mittig
3. Toggle zwischen Free-Prompt und Structured-Prompt
4. Model-Dropdown pro Node
5. "Run"-Button startet die Workflow-Execution in topologischer Reihenfolge
6. Ergebnisse (Text, Bild) werden inline im jeweiligen Node angezeigt

---

## 2. MVP-Scope (Release 1)

**In Scope:**
- Canvas mit React Flow (v12)
- 4 Node-Typen: `PromptNode`, `ImageGenNode`, `ImageRefNode`, `OutputNode`
- Prompt-Box mit Mode-Toggle (Free / Structured)
- Structured-Mode Felder: Ziel, Bildreferenzen (Upload), Stil, Aspect Ratio, Model, Anzahl Varianten
- Model-Dropdown: `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`, `gemini-3-pro-image-preview` (Nano Banana Pro), `gemini-2.5-flash-image` (Nano Banana)
- Workflow-Generator: User-Prompt → Opus 4.7 → JSON-Workflow → auf Canvas gerendert
- Run-Funktion mit topologischem Sort und sequenzieller Execution
- API-Key-Management (lokal im Browser, verschlüsselt)
- Gemini-Ästhetik durchgängig

**Explicitly Out of Scope (v1):**
- Kein Backend/User-Accounts (alles Browser-lokal, IndexedDB für Persistenz)
- Keine Collaboration/Multiplayer
- Keine Deployment/Publishing-Funktion
- Keine History/Versions
- Keine eigenen Custom Nodes durch User

---

## 3. Token-Optimierungs-Strategie (Pflicht ab Tag 1)

Diese Strategie **muss** in der App implementiert werden, nicht nur während des Baus beachtet.

### 3.1 Prompt Caching (Anthropic API)
- Jeder Call zur Claude API nutzt `cache_control: {type: "ephemeral"}` auf dem System Prompt
- System Prompt enthält alle stabilen Teile: Tool-Definitionen, Workflow-Generator-Regeln, Output-Schema
- **Mindestlänge für Caching: 1.024 Tokens** — System Prompt entsprechend dimensionieren
- Cache-Reads kosten 10 % der Input-Tokens → massive Ersparnis bei wiederholten Generations
- 5-Min-TTL default, 1-h-TTL (2× Cache-Write-Kosten) nur bei sehr langen Sessions

### 3.2 Model-Routing nach Task-Komplexität
- **Workflow-Generation (Prompt → JSON-Graph):** Opus 4.7 (braucht Reasoning)
- **Node-Execution bei Text-Tasks:** Sonnet 4.6 default, Haiku 4.5 bei reinen Format-/Rename-Tasks
- **Bild-Generation:** Nano Banana Pro (qualität) oder Flash (speed/cost)
- Opus **nur** für den Graph-Generator — nicht für Ausführung einzelner Nodes

### 3.3 Output-Token-Disziplin
- Output-Tokens kosten **5× mehr** als Input-Tokens
- JSON-Output vom Workflow-Generator via Structured Output erzwingen (`response_format`-ähnliches Muster) — keine Prosa, nur JSON
- `max_tokens` pro Call eng setzen (nicht einfach 4096 als Default)

### 3.4 Client-Side Result-Cache
- Hash von (model + prompt + params) → Ergebnis in IndexedDB
- Identische Re-Runs verbrauchen null Tokens
- Cache-Hit-Indikator im UI (kleines Icon am Node)

### 3.5 Context-Hygiene
- Workflow-Generator-Call sendet **nur** den User-Prompt + Node-Katalog (JSON-Schema), nicht den bestehenden Canvas-Zustand
- Bei Node-Execution nur die direkt eingehenden Edge-Daten mitschicken — nicht den ganzen Graph

### 3.6 Claude Code Dev-Disziplin (gilt während des Baus)
- `CLAUDE.md` **lean** halten (< 2.000 Tokens) — lädt auf jeden Turn neu
- Nur wirklich globale Conventions rein (Stack, Code-Style, No-Comments-Unless-Asked), keine Changelogs
- `/usage` am Session-Ende prüfen, Baseline pro Phase im Kopf haben
- `/compact` wenn Context > 70 % voll ist — lieber freiwillig früh als zwangsweise spät
- Nie `ls -R` oder rekursive Directory-Reads — immer gezielt `glob`/`grep` mit Scope
- Files nicht mehrfach in derselben Session lesen; Opus hat sie schon im Kontext
- `git status`/`git diff` bevorzugen gegenüber ganzen Files erneut lesen
- Tool-Outputs nicht in die Antwort zurück echoen (User sieht sie im Terminal)

### 3.7 Opus 4.7 Tokenizer-Warnung
- Opus 4.7 hat einen neuen Tokenizer: derselbe Text → bis zu **35 % mehr Tokens** als Opus 4.6
- Code und JSON landen am oberen Ende, Prosa am unteren
- Alle Schätzungen in diesem Briefing sind konservativ — realer Verbrauch kann höher sein
- Konsequenz: Sonnet-Routing ist noch wichtiger als sonst

### 3.8 Adaptive Thinking / Effort-Level
- Opus 4.7 Default-Effort nutzen, **nicht** `xhigh` oder `max` außer bei klar definierten Reasoning-Problemen
- Thinking-Tokens werden zu Output-Preisen abgerechnet ($25/Mio) — unsichtbar, aber teuer
- Wenn Opus von selbst in tiefes Thinking geht, sofort unterbrechen und Effort manuell auf `medium` setzen

---

## 4. Tech Stack (vorgegeben — nicht abweichen ohne Nachfrage)

```
Frontend:       Next.js 15 (App Router) + React 19 + TypeScript
Canvas:         @xyflow/react (React Flow v12)
Styling:        Tailwind CSS v4 + shadcn/ui
Animationen:    Framer Motion (für Gradient-Motion, Node-Transitions)
State:          Zustand (lightweight, gut für Canvas-State)
Persistence:    IndexedDB via Dexie.js (API-Keys, Workflows, Result-Cache)
API-SDKs:       @anthropic-ai/sdk (v0.40+), @google/genai
Crypto:         SubtleCrypto (Web Crypto API) für API-Key-Verschlüsselung
Icons:          lucide-react
Fonts:          Google Sans Text / Google Sans Display (oder DM Sans als Open-Source-Näherung falls Google Sans nicht frei verfügbar)
Deployment:     Lokal via `pnpm dev`, Vercel-ready konfiguriert
```

Keine externen State-Machines, kein tRPC, kein Redux, kein Storybook im MVP. Reduktion ist Feature.

---

## 5. Design-Direktive: Gemini-Ästhetik

Quelle: https://design.google/library/gemini-ai-visual-design

### 5.1 Prinzipien
- **Gradienten als Hauptsprache:** konzentrierte leading edges, diffuse tails — vermitteln Energie und Richtung
- **Rundungen überall:** Buttons, Container, Nodes — alles mit `rounded-2xl` bis `rounded-full`
- **Dark Theme default:** tiefes Schwarz/Anthrazit als Canvas-Hintergrund, bunte Gradienten als Akzent
- **"Warm, spatial, rounded":** keine harten Kanten, keine Schlagschatten im Material-Stil, sondern weiche Glows
- **Intentional Motion:** jede Animation hat klaren Start und End — keine Loops ohne Grund
- **Ethereal softness:** blurred Edges, Glass-Morphism sparsam, Feeling von "Raum statt Objekt"

### 5.2 Farbpalette
```
Background Canvas:  #0A0A0F (nahezu schwarz, leicht bläulich)
Surface/Nodes:      #16161F mit 60% Opacity + backdrop-blur
Primary Gradient:   linear von #4285F4 (Google Blue) → #9B72CB (Purple) → #D96570 (Coral)
Secondary Gradient: linear von #1BA1E2 → #4285F4
Success/Run:        Gradient #34A853 (Green) → #4285F4 (Blue)
Error:              #EA4335 mit soft glow
Text primary:       #FFFFFF bei 95%
Text secondary:     #FFFFFF bei 60%
Edges (Canvas):     Gradient entlang Edge, animated flow-particles bei Run
```

### 5.3 Gemini-Signaturelemente
- **Sparkle-Icon** (aus lucide: `Sparkles`) als AI-Indikator an Nodes
- **Kreis-basierte Thinking-State-Animation:** pulsierender Gradient-Kreis während Node executed
- **Google-Dots:** dezent im Loading-State (4 farbige Kreise)
- **Flow-Particles auf Edges** während Execution (kleine weiße Dots wandern entlang der Edge)

### 5.4 Typografie
- Headlines: Google Sans Display / DM Sans — leicht, großzügig, rounded terminals
- Body: Google Sans Text / DM Sans — Regular 400, Medium 500
- Mono (für Prompts): DM Mono

---

## 6. Feature-Spezifikation im Detail

### 6.1 Canvas
- Infinite canvas, zoom 0.1×–2×, pan mit Space+Drag oder Middle-Click
- Minimap unten rechts (shadcn-styled, translucent)
- Controls (Zoom-In/Out/Fit) unten links
- Background: subtile Dot-Grid (nicht Lines), Gradient-Radial als Ambient-Licht

### 6.2 Nodes (Custom React Flow Nodes)
Gemeinsame Struktur für alle Nodes:
- Rounded rectangle, `rounded-2xl`
- Glas-Effekt: `bg-white/5 backdrop-blur-xl border border-white/10`
- Header-Leiste mit Gradient-Strich (3–4 px, Sparkle-Icon, Node-Titel)
- Input-Handles links, Output-Handles rechts (kleine Kreise mit Gradient)
- Status-Indicator top-right: idle (grau), running (pulsierender Gradient), done (grüner Gradient), error (roter Glow)

**PromptNode** (Text-Generation):
- Felder: Model-Dropdown, Prompt-Textarea, System-Prompt (collapsible), Temperature-Slider
- Output: Text (erscheint im Node unter dem Input, scrollable bis 300 px)

**ImageGenNode** (Nano Banana / Pro):
- Felder: Model-Dropdown (Pro/Flash), Prompt, Aspect Ratio (1:1, 16:9, 9:16, 4:3), Resolution (1K/2K/4K)
- Accept-Handle für Bild-Refs (up to 14, matching Nano Banana Pro)
- Output: generiertes Bild (preview, klickbar für Fullsize-Lightbox)

**ImageRefNode** (Bild-Upload/Passthrough):
- Drag-&-Drop-Zone oder URL-Input
- Preview + Metadaten (Dimensions, Size)
- Output-Handle sendet Base64 oder URL

**OutputNode** (finales Ergebnis):
- Zeigt konsolidiert das Ergebnis des verketteten Workflows
- Export-Button: Copy as JSON, Download Image(s), Copy Text

### 6.3 Prompt-Box (fixed bottom-center)
- Position: `fixed bottom-6 left-1/2 -translate-x-1/2`
- Breite: `max-w-3xl w-[calc(100%-3rem)]`
- Glas-Container, `rounded-full` im Free-Mode, `rounded-3xl` expanding im Structured-Mode
- **Toggle** (links im Container): Icon-Switch Free-Prompt ⇄ Structured
- **Free-Mode:** einzelnes Input-Feld, "Describe your workflow…"
- **Structured-Mode** (expandiert vertikal):
  - Ziel (Textarea, kurz)
  - Bildreferenzen (Upload-Zone)
  - Stil (Input oder Chips mit Presets: Cinematic, Minimal, Editorial, Photographic, Illustrative)
  - Zielmodell (Dropdown)
  - Aspect Ratio (Chips)
  - Anzahl Varianten (Stepper 1–4)
  - Zusätzliche Constraints (collapsible)
- **Submit-Button** (rechts): Gradient-Circle mit Sparkles-Icon, morpht zu Spinner bei Generation

### 6.4 Workflow-Generation Flow
1. User tippt Prompt und drückt Enter (oder Submit)
2. Frontend sendet an interne Route `/api/generate-workflow` → Claude Opus 4.7
3. Opus bekommt System-Prompt mit:
   - JSON-Schema für Workflow-Struktur
   - Node-Katalog mit jeweiliger Funktion
   - Few-Shot-Beispiele (2–3)
   - Regel: nur JSON zurück, kein Prose
4. Response wird geparst → React Flow State aktualisiert
5. Nodes animieren sanft ins Canvas (Stagger mit Framer Motion)
6. Auto-Layout via ELK.js (falls Nodes > 3) oder Dagre (falls ≤ 3)

### 6.5 Run-Execution
- "Run"-Button oben rechts (prominent, Gradient-Fill)
- Topologischer Sort der Nodes
- Sequenzielle Execution: jeder Node wartet auf seine Inputs
- Während Execution: Flow-Particles auf Edges, Status-Indicator pulsiert
- Parallel-Execution wo möglich (Nodes ohne geteilte Dependencies)
- Fehler-Handling: ein fehlgeschlagener Node bricht den Zweig ab, aber nicht den ganzen Workflow

### 6.6 API-Key-Management
- Settings-Modal erreichbar via Gear-Icon top-right
- Felder: Anthropic API Key, Google Gemini API Key
- Speicherung: verschlüsselt in IndexedDB via Web Crypto API (AES-GCM, Master-Key aus Browser-Fingerprint abgeleitet — nicht perfekt, aber besser als plain)
- Hinweis-Text: "Keys bleiben in deinem Browser. Keine Server-Speicherung."
- Alternative: Umgebungsvariablen via `.env.local` für Dev-Mode (gelesen nur wenn kein User-Key gesetzt)

---

## 7. API-Integrationen

### 7.1 Anthropic (Claude)
- Endpoint: `https://api.anthropic.com/v1/messages`
- Models: `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`
- SDK: `@anthropic-ai/sdk` v0.40+
- Prompt Caching aktiv auf System-Prompt bei jedem Call
- Headers: `anthropic-version: 2023-06-01`, `x-api-key: <key>`

### 7.2 Google Gemini (Nano Banana / Pro)
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Models:
  - `gemini-3-pro-image-preview` (Nano Banana Pro — 2K/4K, beste Text-Rendering)
  - `gemini-2.5-flash-image` (Nano Banana — fast/cheap)
- SDK: `@google/genai`
- Response enthält Base64-encoded Images (oder URL bei manchen Providern)
- Pricing (direkt bei Google): $2/M Input, $12/M Output
- Alternative für günstigeren Testbetrieb: Kie.ai (~$0.09/Image 1K–2K, ~$0.12 für 4K)

### 7.3 API-Proxy-Layer (Pflicht!)
- Next.js API-Routes proxyen alle Calls (`/api/claude/*`, `/api/gemini/*`)
- Vorteil: API-Keys niemals im Client-Bundle, CORS-Probleme umgangen
- Streaming für Claude-Responses via Server-Sent Events

---

## 8. AI-First Direktive an Opus 4.7 (harte Regeln)

Du arbeitest in Claude Code auf dem Max-20x-Plan des Users. Dein Session-Fenster ist 5 h, dein Weekly Opus-Budget ist ~24–40 h. **Beide Limits sind real und werden erreicht**, wenn du nicht diszipliniert arbeitest.

### 8.1 Modell-Routing (Pflicht in der Claude-Code-Session)

**Default ist Sonnet 4.6.** Setze das als erstes in der Session via `/model sonnet`.

Wechsel zu Opus 4.7 **nur** für:
- Den initialen Plan und Phasen-Review
- Architektur-Entscheidungen (State-Management-Pattern, API-Proxy-Design)
- Den Workflow-Generator-System-Prompt (Kernstück des Produkts)
- Debugging von Bugs, die Sonnet nach einem Versuch nicht gelöst hat

Nach jeder Opus-Aufgabe: zurück auf Sonnet via `/model sonnet`. Opus darf nicht "vergessen" werden.

Haiku 4.5 für: reine Renames, Format-Fixes, Dependency-Bumps, triviale Refactors.

### 8.2 Kontext-Hygiene (spart Tokens in jeder Turn)

- Lies Files **einmal** pro Session — nicht mehrfach. Du hast sie im Kontext.
- Keine `ls -R`, keine rekursiven Reads ganzer Directories. Nutze `glob` und `grep` mit engem Scope.
- `git status` / `git diff` bevorzugt gegenüber erneutem Lesen ganzer Files.
- Tool-Outputs nicht in deine Antwort zurückkopieren — der User sieht sie im Terminal.
- Keine "hier ist das gesamte File nochmal"-Antworten. Nur der Diff zählt.
- Bei Kontext > 70 % (`/usage` checken): `/compact` ausführen, dann weiter.

### 8.3 Session-Protokoll (Start → Arbeit → Ende)

**Beim Start jeder Session:**
1. `/model sonnet` — Default setzen
2. `/usage` — Rest-Budget checken und dem User nennen
3. `git log --oneline -10` — lesen, wo wir aufgehört haben
4. Falls `PROGRESS.md` existiert: lesen, kurze Rekapitulation an User, dann weitermachen
5. Falls nicht (= erste Session): Plan generieren, `PROGRESS.md` anlegen

**Während der Arbeit:**
- Vor jeder neuen Phase: `/usage` checken, dem User sagen "Session auf X %, Weekly auf Y %"
- Bei > 85 % Session-Verbrauch: Phase nicht mehr anfangen, stattdessen sauber beenden
- Jeder Command-Fail: **einmal** Error lesen, **einen** gezielten Fix, nicht drei Versuche blind hintereinander
- Wenn Fix-Versuch 2 scheitert: User fragen statt raten

**Beim Ende jeder Phase:**
1. Kurzer `pnpm dev`-Smoke-Test (starten, sehen ob es lädt, stoppen)
2. `git add -A && git commit -m "<Phase X>: <1-Zeilen-Summary>"`
3. `PROGRESS.md` aktualisieren: welche Phase fertig, welche nächste, offene Punkte, letzte Erkenntnisse
4. Dem User sagen: "Phase X done. Safe point. Session bei Y %. Willst du weitermachen oder später fortsetzen?"

**Beim Session-Ende (vom User ausgelöst oder bei 85 % Limit):**
1. Laufende Änderungen committen (`git commit -m "WIP: <was gerade offen ist>"`)
2. `PROGRESS.md` final updaten mit exakt dem Stand
3. Eine Zeile Resume-Instruktion: *"Nächste Session: `claude` starten, `/model sonnet`, `PROGRESS.md` lesen, weiter mit Phase X Punkt Y."*

### 8.4 PROGRESS.md — Pflicht-Datei

Im Projekt-Root. Format:

```markdown
# Progress

## Aktueller Stand
Phase: <N>
Status: <in progress | done | blocked>
Letzter Commit: <hash> <message>

## Nächster Schritt
<eine Zeile, konkret>

## Offene Punkte
- <Punkt 1>
- <Punkt 2>

## Entscheidungen in dieser Session
- <was wurde festgelegt, das relevant für spätere Sessions ist>
```

Diese Datei wird **nicht** im Kontext mitgeschleppt — sie wird am Session-Start gezielt gelesen. Halte sie unter 1.000 Tokens.

### 8.5 Entscheidungs-Autonomie

**Frage nur, wenn:**
- Eine Entscheidung irreversibel ist (Auth-Layer, Datenbank-Schema dauerhaft)
- Zwei gleichwertige Optionen jeweils ≥ 4 h Arbeit bedeuten
- Der User explizit Feedback fordert (z. B. visuelles Review einer Node-Version)

**Entscheide selbst:**
- Namensgebung, Ordnerstruktur, welche shadcn-Components
- Exakte Tailwind-Classes, Animation-Timings (Gemini: 300–600 ms, easeInOut/spring)
- Test-Strategie (minimal, happy paths, kein Over-Engineering)
- Whether to split a component or keep it inline

### 8.6 Phasen-Struktur (7 Phasen, Phase 5 gesplittet)

- **Phase 1:** Projekt-Setup, Stack-Install, `CLAUDE.md`, `PROGRESS.md`, leeres Canvas + statische Prompt-Box (nur visuell)
- **Phase 2:** React Flow Canvas + 4 Node-Typen (statisch, kein Backend)
- **Phase 3:** Settings-Modal + API-Key-Encryption (IndexedDB + Web Crypto)
- **Phase 4:** Workflow-Generator (Opus-Call → JSON → Canvas-Render mit Auto-Layout)
- **Phase 5a:** Single-Node-Execution (ein Node läuft, Ergebnis wird im Node angezeigt)
- **Phase 5b:** Multi-Node-Chaining (topologischer Sort, Edge-Daten-Passing, Flow-Particles)
- **Phase 6:** Structured-Prompt-Mode + Model-Dropdowns + Motion-Polish
- **Phase 7:** README + Demo-Workflow als Seed, finaler Smoke-Test

Jede Phase endet mit git commit und `PROGRESS.md`-Update. Das sind deine Checkpoints.

---

## 9. Definition of Done

Ein Release-1-Deliverable ist fertig, wenn:
1. `pnpm install && pnpm dev` startet das Projekt fehlerfrei
2. Settings-Modal akzeptiert beide API-Keys und speichert sie verschlüsselt
3. Free-Prompt: "Generate a magenta Telekom Speedport router in a spring meadow, then create 3 variations" erzeugt einen Workflow mit mind. 3 Nodes, die sinnvoll verkettet sind
4. Structured-Prompt: alle Felder nutzbar, generiert ebenfalls validen Workflow
5. Run-Button exekutiert den Workflow; mind. 1 Text- und 1 Bild-Node liefern Output
6. Gemini-Ästhetik durchgängig sichtbar (Gradienten, Rundungen, Motion)
7. Console zeigt bei Re-Run eines identischen Workflows "cache hit" (Prompt Caching funktioniert)
8. README enthält Screenshot und 3-Schritt-Setup
9. Git hat mind. 8 sinnvolle Commits (entsprechend Phasen 1, 2, 3, 4, 5a, 5b, 6, 7)
10. `PROGRESS.md` zeigt am Ende: Status "done", keine offenen Punkte

---

## 10. Setup-Anleitung für Julien (einmalig, vor Start)

```bash
# 1. Claude Code installieren (falls noch nicht)
npm install -g @anthropic-ai/claude-code

# 2. Projekt-Ordner anlegen und betreten
mkdir ~/projects/prompt-canvas && cd ~/projects/prompt-canvas

# 3. Git initialisieren (Opus committet später rein)
git init

# 4. Briefing-Datei in den Projekt-Root legen
#    Speichere dieses Dokument als BRIEFING.md direkt in ~/projects/prompt-canvas/

# 5. API Key setzen — ODER Max-Plan-Login nutzen (empfohlen für dich)
#    Wichtig: ANTHROPIC_API_KEY NICHT setzen, sonst wird API-Usage statt Max-Plan abgerechnet.
#    Falls ein alter API-Key in deiner Shell-Konfig liegt: `unset ANTHROPIC_API_KEY`

# 6. Claude Code starten
claude

# 7. Im Claude-Code-Prompt den Text aus Abschnitt 11 einfügen
#    (der Prompt referenziert BRIEFING.md und PROGRESS.md)
```

Aktuelle Details, Installations-Requirements und Subscription-Optionen: https://docs.claude.com/en/docs/claude-code/overview

---

## 11. DER FINALE PROMPT (in Claude Code einfügen)

> Du bist Senior Full-Stack-Engineer mit Autonomie. Im Projekt-Root liegt `BRIEFING.md` — das ist dein vollständiger Auftrag. Es gilt verbindlich, inklusive aller Regeln in Abschnitt 3 und 8.
>
> **Deine ersten Aktionen — in exakt dieser Reihenfolge:**
>
> 1. `/model sonnet` — Default setzen. Opus nur wenn Abschnitt 8.1 es explizit erlaubt.
> 2. `/usage` — Rest-Budget checken und mir nennen (Session %, Weekly %).
> 3. `BRIEFING.md` einmal komplett lesen.
> 4. `git log --oneline -10` und prüfen, ob `PROGRESS.md` existiert.
>    - Existiert sie nicht: Du bist in Session 1. Generiere den Plan (max. 15 Bullets), lege `PROGRESS.md` an, stelle mir Blocker-Fragen (falls vorhanden), dann starte Phase 1 — **erst** nach meinem "Go".
>    - Existiert sie: Lies sie, rekapituliere in 3 Zeilen wo wir stehen, frag mich kurz "Weiter mit Phase X Punkt Y?" — erst bei "Go" geht's weiter.
>
> **Während der Arbeit** gelten die Regeln aus Abschnitt 8 ohne Ausnahme:
> - Modell-Routing: Sonnet Default, Opus nur für Architektur / Workflow-Generator-Design / hartnäckiges Debugging
> - Kontext-Hygiene: keine rekursiven Reads, keine doppelten File-Reads, `/compact` bei 70 %
> - Fehler: einmal Error lesen → **ein** gezielter Fix → wenn das scheitert, mich fragen
> - Ende jeder Phase: `pnpm dev`-Smoke, `git commit`, `PROGRESS.md` update, Session-Stand an mich
>
> **Wenn du 85 % Session-Verbrauch erreichst:** Sauber abschließen. WIP commit, `PROGRESS.md` final, Resume-Instruktion schreiben, dann stop. Keine neue Phase anfangen.
>
> **Was ich nicht will:**
> - "Hier ist das komplette File"-Antworten (nur Diffs oder Änderungs-Zusammenfassungen)
> - Tool-Outputs zurück-echoed bekommen (ich sehe sie im Terminal)
> - Drei spekulative Fixes hintereinander ohne den Error vernünftig gelesen zu haben
> - xhigh-Thinking außer du begründest es mir konkret
>
> **Gemini-Ästhetik** ist nicht Polish, sondern Kern. Wenn du zwischen "funktional" und "schön gemini-esque" wählen musst, wähle schön — solange es funktional erreichbar ist.
>
> Fang mit Schritt 1 an.

---

## Anhang A: Recherche-Grundlage für Token-Strategie

**Anthropic-Empfehlungen (offiziell):**
- Prompt Caching auf System-Prompt, Tools, stabilem Prefix
- `cache_control: {type: "ephemeral"}` am letzten stabilen Block
- Min. 1.024 Tokens für Cache-Trigger (Sonnet), Cache-Reads = 0.1× Input-Cost
- Outputs 5× teurer als Inputs → Output-Hygiene priorisieren
- Model-Auswahl nach Task-Komplexität (Haiku für mechanische Tasks, Sonnet als reliable middle)

**Community Best Practices:**
- CLAUDE.md < 2.000 Tokens halten (lädt auf jeden Turn)
- Redis/IndexedDB als zweite Cache-Schicht auf Application-Level
- Scope-Discipline: nicht den ganzen Codebase referenzieren, sondern spezifische Files
- `/cost` regelmäßig checken, Baseline-Task für Vergleiche festlegen
- Lange Gaps zwischen Messages killen 5-Min-Cache → auf 1-h-Cache upgraden bei Long-Sessions

**Was Opus 4.7 davon autonom umsetzen kann (alles):**
- Claude kennt die Caching-APIs und implementiert sie selbstständig korrekt
- Model-Routing kann direkt in den API-Proxy eingebaut werden
- Output-Token-Limits pro Call setzt Opus sinnvoll, wenn im Code-Style dokumentiert
- Result-Caching via IndexedDB ist Standard-Pattern, keine Anleitung nötig

**Was du als Julien beitragen musst: nichts Implementierungsnahes.** Du reviewst nach jeder Phase, gibst Feedback zur Ästhetik und Prioritäten, fütterst die API-Keys. Das war's.

---

## Anhang B: Nano Banana Pro — API-Details

**Direkt via Google:**
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`
- API Key: Google AI Studio (https://aistudio.google.com)
- Pricing: $2/M Input-Tokens, $12/M Output-Tokens (OpenRouter-Benchmark)

**Via Aggregator (für günstigeren Testbetrieb):**
- Kie.ai: $0.09/Image bei 1K–2K, $0.12 bei 4K
- Together AI: flat image-based pricing
- AI/ML API: creditbasiert

**Besonderheiten:**
- Bis zu 14 Input-Referenzbilder, Identity-Konsistenz über 5 Personen
- Search-grounded (echtes Weltwissen für Infografiken)
- SOTA Text-Rendering in Bildern (wichtig für deine Telekom-Creative-Use-Cases)
- Aspect Ratios flexibel (1:1, 16:9, 9:16, 4:3, etc.)
- 2K/4K bei Pro, 1K bei Flash

Opus soll den direkten Google-Endpoint nutzen, aber den API-Proxy-Layer so bauen, dass ein Provider-Swap (Kie.ai/Together) durch eine ENV-Variable möglich ist. Das ist dein späterer Hebel für Kostenkontrolle.

---

**Ende des Briefings.** Viel Erfolg, Julien.

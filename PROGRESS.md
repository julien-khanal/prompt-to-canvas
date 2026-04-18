# Progress

## Aktueller Stand
Phase: 6
Status: done
Letzter Commit: Phase-6 (direkt unten)

## Nächster Schritt
Phase 7: README (Screenshot + 3-Schritt-Setup), Demo-Workflow als Seed beibehalten/kuratieren, finaler DoD-Smoke (#1–#10 Briefing §9 durchchecken), optional README-Polish für Vercel-Deploy.

## Offene Punkte
- Flow-Particles als Custom-Edge (mehr Gemini-Signature als default `animated` Dashes) — optional-future Polish, nicht DoD-kritisch.
- Output-Node bekommt derzeit keinen Auto-Propagation-Visual, wenn nur per Node-Run statt globalem Run ausgeführt. Kein Bug, UX-Detail.
- Generator-Prompt v2: Variations-Heuristik geschärft (exakt N Nodes, distinct-dimension-rule). Verifizieren beim nächsten Generate mit "3 Variationen"-Prompt.

## Entscheidungen in dieser Session
- **fitView-on-replace**: `graphVersion` im Store, incrementiert in `replaceGraph`. `Canvas` watched `graphVersion` → `fitView({padding: 0.2, duration: 650})` nach 80 ms.
- **`humanizeError`** (`src/lib/errors/humanize.ts`): Extrahiert `message` aus `{error: {...}}` / `{message}` JSON-Shapes, verdichtet Quota/Rate-Limit-Wälle auf 1 Zeile ("Quota/rate limit exceeded — check plan & billing"), Rest auf 240 Zeichen. Volle Raw-Message via `title`-Attribut auf Hover.
- **Inline Model-Dropdowns**: Neue `NativeSelect` (`src/components/ui/select.tsx`, Glass-Pill mit Chevron, native `<select>` styled). Verdrahtet in `PromptNode` (Sonnet/Opus/Haiku) + `ImageGenNode` (Pro/Flash). Ändern → `patchNodeData({model, cacheHit: false})` — invalidiert Cache-Chip automatisch.
- **StructuredForm** (`src/components/prompt/StructuredForm.tsx`): Goal-Textarea, Style-Chips (Cinematic/Minimal/Editorial/Photographic/Illustrative), Aspect-Chips (1:1/16:9/9:16/4:3), Target-Model-Chips (Pro/Flash), Variants-Stepper (1–4), Reference-Image-Uploads (drag-to-add, Preview, X-Remove, max 14), Collapsible Constraints. `buildStructuredPrompt(v)` → natural-language prompt für den selben Generator.
- **PromptBox** verdrahtet StructuredForm: `layout`-Motion, Height-Animation beim Expand. Reference-DataURLs werden nach `replaceGraph` in die generierten `imageRef`-Nodes injiziert (`source: "upload"`, `dataUrl`).
- **Generator v2** (`WORKFLOW_GENERATOR_VERSION = "2026-04-18-v2"`): Variations-Heuristik verschärft — "exactly N separate imageGen nodes", distinct-dimension-rule (Komposition/Licht/Winkel/Palette/Framing), Default 3 wenn "a few"/"options" implied.
- **Node-Entry-Stagger**: `BaseNode` ist jetzt `motion.div` mit `initial/animate` (opacity 0→1, y 8→0, scale 0.97→1, 450 ms easeOutQuart).
- TS-Fix: `size` in Props collidiert mit `SelectHTMLAttributes.size: number` → umbenannt auf `density`.

## Resume
Nächste Session: `claude` → `/model sonnet` → `PROGRESS.md` → **Phase 7** (README, Demo-Seed-Workflow, DoD-Smoke durchgehen).

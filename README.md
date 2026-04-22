# Prompt Canvas

A prompt-to-workflow canvas that generates a node graph from a plain-language brief and chains Claude + Gemini models end-to-end. Built for creative iteration in the Weavy / Figma Weave spirit, wrapped in a Gemini-inspired visual language.

![Prompt Canvas screenshot](docs/screenshot.png)

## What it does

Type a brief → Claude Opus 4.7 generates a runnable workflow → the graph lands on an infinite canvas with auto-layout → click **Run** to execute text and image nodes in topological order. Results render inline, identical re-runs hit a local cache for zero API cost.

- **Workflow generator** — Opus 4.7 emits a strict-JSON graph. System prompt is prompt-cached (`cache_control: ephemeral`) so repeat generations cost ~10 % of the first call.
- **4 node types** — `prompt` (Claude Sonnet/Opus/Haiku), `imageGen` (Nano Banana Pro / Flash), `imageRef` (upload or URL), `output` (consolidator with export).
- **Structured mode** — goal · style chips · aspect · target model · variant count · reference uploads (up to 14) · constraints. Same generator, composable brief.
- **Run engine** — topological layering, parallel within a layer, per-node re-run, cache-first (SHA-256 of model + prompt + params → IndexedDB), animated edges during execution, branch-level failure isolation.
- **Encrypted keys** — Anthropic + Gemini keys stored AES-GCM-256 (PBKDF2 from a per-browser fingerprint) in IndexedDB. No server persistence.

## Setup (3 steps)

```bash
# 1. Install
pnpm install

# 2. Run
pnpm dev

# 3. Open http://localhost:3000, click the gear icon, paste your keys
#    - Anthropic: https://console.anthropic.com/settings/keys
#    - Gemini:    https://aistudio.google.com/apikey
```

Requires Node ≥ 20. Do **not** export `ANTHROPIC_API_KEY` in your shell if you also use Claude Code with a Max plan — that redirects your Claude-Code billing to API credits.

## Try it

Free prompt:

> Generate a magenta Telekom Speedport router in a spring meadow, then create 3 variations

Structured mode:

- Goal: "Premium pet product in a spring meadow"
- Style: Photographic · Aspect: 16:9 · Model: Nano Banana Pro · Variants: 3

Click **Run** (top right) once the graph appears. Run again — you'll see the `CACHE` chip on every node, zero token spend.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn primitives · `@xyflow/react` v12 · Framer Motion · Zustand · Dexie · `@anthropic-ai/sdk` · `@google/genai` · `elkjs` · Web Crypto API.

## Token discipline

Built-in, not bolt-on:

- System prompt cached (`cache_control: ephemeral`, ≥ 1024 tokens)
- Default routing: Opus for graph generation · Sonnet for node execution · Haiku for trivial text ops
- `temperature` omitted for Opus 4.7 (parameter deprecated on this model)
- Output cap per call: 1024 for node execution, 2048 for generator
- Client-side result cache keyed on `sha256(model, prompt, params, upstream hashes)` — identical re-runs cost nothing
- Node execution ships only its direct-upstream edge data, not the full graph

## Architecture map

```
src/
  app/
    api/
      generate-workflow/   Opus 4.7 → strict-JSON graph, cached system
      claude/execute/      Sonnet/Opus/Haiku for prompt nodes
      gemini/execute/      Nano Banana (Pro/Flash) for image nodes
    page.tsx               CanvasShell + PromptBox
  components/
    canvas/                React Flow wiring, dot-grid, gradient edges
    nodes/                 BaseNode + 4 specializations
    prompt/                Free + Structured prompt box
    settings/              Encrypted keys modal
    ui/                    Dialog, field, select primitives
  lib/
    canvas/                Zustand store, seed graph, types
    cache/                 Hash + IndexedDB result cache
    crypto/                AES-GCM keyring (PBKDF2 + fingerprint)
    db/                    Dexie schema
    executor/              executeNode (single) + runWorkflow (topo)
    workflow/              System prompt, schema/validator, ELK layout
    errors/                Humanize API error JSON to one line
```

## Limitations (v1)

- No backend, no accounts, no collaboration — everything is browser-local.
- Key encryption is fingerprint-derived (deterministic per browser), not user-password. Sufficient for a local creative tool, not for shared machines.
- Nano Banana Pro requires a Google AI Studio billing plan (free tier has zero quota for `gemini-3-pro-image-preview`). Switch the node model to Nano Banana (`gemini-2.5-flash-image`) to stay on the free tier.
- `temperature` controls on Prompt nodes are ignored when the model is `claude-opus-4-7`.

## Control from Claude Cowork (optional)

The canvas exposes a small REST bridge so the Mac Cowork assistant can read your workflow and operate it for you ("modify Variation B and re-run", "drop this image as a brand reference", "build me a new workflow with the Telekom skill active"). Browser stays the source of truth, all execution uses the keys already in IndexedDB.

```bash
# 1. Make port 3000 reachable from Cowork's sandbox VM
brew install cloudflared
cloudflared tunnel --url http://localhost:3000   # prints a https://*.trycloudflare.com URL

# 2. Generate a shared secret
openssl rand -hex 32

# 3. Paste it as COWORK_API_SECRET in .env.local, restart pnpm dev
# 4. Paste the same value into Settings modal -> "Cowork bridge secret"
# 5. Drag cowork-skill/SKILL.md into your Claude Mac app's Cowork skills
# 6. Tell Cowork the tunnel URL + secret once
```

Image uploads from Cowork go via multipart so the binary never enters the LLM context. See `cowork-skill/README.md` for the full setup walk-through.

## Export workflows as MCP tools (optional)

Any workflow with `{{placeholder}}` parameters in its prompts can be exported as a Model Context Protocol tool — callable from Claude Desktop, Cursor, or any other MCP-aware client. The exported tool proxies back to your running canvas via the same Cowork bridge, so your perfected workflows become reusable functions for every AI agent on your machine.

```text
1. Add {{var}} placeholders to a prompt:
   "Hero image for {{brand}} themed {{theme}}"
2. Open Dashboard → hover the workflow → Plug icon → "Export as MCP tool"
3. Download the generated .mjs script
4. In its folder: npm i @modelcontextprotocol/sdk
5. Paste the shown config block into ~/Library/Application Support/Claude/claude_desktop_config.json
6. Restart Claude Desktop — your workflow now appears as a callable tool.
```

## Deploy

Vercel-ready. `pnpm build` produces a clean Next.js build; the three API routes run on Node runtime. Keys are never sent to or stored on your deployment — they live in the user's browser IndexedDB.

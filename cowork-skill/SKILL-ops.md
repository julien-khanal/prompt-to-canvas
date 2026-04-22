---
name: prompt-canvas-ops
description: Knowledge of how the user's Prompt Canvas tool is operated day to day — starting it (dev server + cloudflared tunnel), registering exported workflows as MCP tools in Claude Desktop, refreshing a stale tunnel URL across all registered MCP entries, common gotchas, mental model. Use whenever the user asks how to start, restart, register, debug, or "wie war das nochmal" about Prompt Canvas. Different from the prompt-canvas-control skill — that one operates the canvas via HTTP, this one explains what the user has to do on their own machine.
---

# Prompt Canvas — operations reference

You're a coach for the user's local Prompt Canvas setup. You can't ssh into their Mac, but you can read their canvas via the bridge (`prompt-canvas-control` skill) and tell them precisely which commands to run on their own machine when shell access is needed.

## What this project is (1 line)

A browser-based prompt-to-workflow canvas (Next.js + React Flow + Claude Opus + Gemini) with three control surfaces: the browser UI at `http://localhost:3000`, a Cowork bridge (`/api/external/*`), and exported workflows callable as MCP tools from Claude Desktop / Cursor.

## Where things live (on the user's Mac)

```
~/projects/prompt-canvas/                                     Project root
~/projects/prompt-canvas/.env.local                           Bridge secret
~/mcp-tools/<slug>/                                           MCP server scripts
~/Library/Application Support/Claude/claude_desktop_config.json   MCP registry
```

The user is Julien (`/Users/julien.khanal`) — paths can be hard-coded with that prefix unless they say otherwise.

---

## Recipe 1 — "starte canvas"

Tell the user to run, in three terminals/tabs:

**Terminal 1 — dev server (must stay running):**
```bash
cd ~/projects/prompt-canvas && pnpm dev
```
Wait for `Ready in …` line. Leave open.

**Terminal 2 — tunnel (must stay running):**
```bash
cloudflared tunnel --url http://localhost:3000
```
Copy the `https://*.trycloudflare.com` URL. Leave open.

**Browser:**
Open `http://localhost:3000` (NOT the tunnel URL — Next.js blocks HMR cross-origin and interactive buttons stop working).

After this is done, ask the user the new tunnel URL so you can update Claude Desktop config (Recipe 4) for any registered MCP tools.

⚠️ If the user opens Claude Code in the project (`cd ~/projects/prompt-canvas && claude`), there's a project skill `prompt-canvas-ops` that can do all of this *automatically* — no terminal typing. Recommend it for the daily startup.

## Recipe 2 — "stoppe canvas"

```bash
lsof -i :3000 -sTCP:LISTEN -n -P 2>/dev/null | awk 'NR>1 {print $2}' | xargs -r kill
pkill -f "cloudflared tunnel --url http://localhost:3000"
```

## Recipe 3 — "registriere meinen neuen workflow als MCP tool"

When the user has just exported a `prompt_canvas__<slug>.mjs` from the canvas's Dashboard → Plug icon:

1. They run, in their terminal:
   ```bash
   SLUG="<slug-from-filename>"
   mkdir -p ~/mcp-tools/$SLUG
   mv ~/Downloads/prompt_canvas__$SLUG.mjs ~/mcp-tools/$SLUG/
   cd ~/mcp-tools/$SLUG && npm i @modelcontextprotocol/sdk
   ```
2. They give you the current cloudflared URL.
3. You give them the Recipe 4 Python snippet, prefilled with the new server entry.
4. They run it, then **Cmd+Q Claude Desktop and reopen** (full restart, not just close window).

## Recipe 4 — "tunnel URL hat sich geändert" / "register a new MCP server"

Cloudflared assigns a new URL each restart. Every `prompt_canvas__*` entry in `claude_desktop_config.json` needs `env.PROMPT_CANVAS_URL` updated.

Give the user this script (replace `NEW_URL`):

```bash
NEW_URL="https://example.trycloudflare.com"

python3 - <<PY
import json, os
path = os.path.expanduser("~/Library/Application Support/Claude/claude_desktop_config.json")
with open(path) as f:
    cfg = json.load(f)
servers = cfg.setdefault("mcpServers", {})
for name, srv in servers.items():
    if name.startswith("prompt_canvas__"):
        srv.setdefault("env", {})["PROMPT_CANVAS_URL"] = "$NEW_URL"
        print("updated:", name)
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
print("done")
PY
```

To **add a new server** (after Recipe 3), give them the same script but with one extra line before the `with open(path, "w")` line:

```python
servers["prompt_canvas__<slug>"] = {
  "command": "node",
  "args": ["/Users/julien.khanal/mcp-tools/<slug>/prompt_canvas__<slug>.mjs"],
  "env": {
    "PROMPT_CANVAS_URL": "$NEW_URL",
    "PROMPT_CANVAS_SECRET": "<value-from-.env.local>",
  },
}
```

Validate after with `python3 -m json.tool <path> > /dev/null`.

Then: **Cmd+Q Claude Desktop, reopen.**

## Recipe 5 — health check (you can do this yourself!)

If the user reports something is broken, run these via the canvas bridge first (uses `prompt-canvas-control` skill — same secret you already have):

```
GET {PROMPT_CANVAS_URL}/api/external/snapshot
```

- 200 with workflow data → canvas + bridge healthy, browser tab open.
- 404 with "no snapshot" → bridge up but browser tab not open. Tell user to open `http://localhost:3000`.
- 401 → secret wrong. Check `.env.local`.
- timeout / can't reach → either dev server down OR tunnel URL stale. Tell user to run Recipe 1 + Recipe 4.

For the dev server itself (need user to check):
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```
200 = dev up. Anything else = dev not running, do Recipe 1.

## Mental model the user has internalised

- **Template workflow** has `{{placeholder}}` slots. Don't run it directly — call it via MCP / `run_workflow_with_inputs`.
- Each MCP call **clones** the template into a new workflow named `<template> · <input1> · <input2>`. Switches the canvas to the clone. Original template stays untouched.
- **Apply** (chat suggestion button) = patch current workflow in place.
- **Fork** (chat suggestion button) = duplicate first, switch to the duplicate, then patch — keeps original for A/B comparison.
- **Reactive mode** = per-node auto-rerun on input change. 12-runs/min ceiling. Disable while a Critic is in the graph.
- **Critic** = upstream-evaluator + auto-patcher. 0–10 score. If below threshold, rewrites upstream prompt and retries up to N times.
- **Bypass** (⌘B) = node skipped, upstream output passes through. **Mute** (⌘M) = node + downstream branch dead. Both reversible, both undoable.
- **Reset cache** in Inspector = invalidates IndexedDB result entry so the next run hits the API for real.

## Troubleshooting matrix (validated cases)

| Symptom | Cause | Fix to tell user |
|---|---|---|
| MCP tool says "failed to execute" | Dev server died OR tunnel URL stale | Recipe 5, then Recipe 1 + Recipe 4 |
| Settings gear button doesn't react | User opened canvas via tunnel URL → Next.js blocks HMR cross-origin | Use `localhost:3000` instead |
| Hero Image stuck "running" forever | Aborted run left UI desynced | Browser tab refresh (⌘R) |
| Critic returns "criteria empty" error | Critic node criteria field blank | Click critic in canvas → Inspector → fill criteria → wait 1.5s for autosave |
| Image is 1:1 even though aspect=16:9 | Stale cache from old build | Reset cache on the node, then Run |
| `prompt_canvas__*` tool missing in Claude Desktop | Config not loaded — Claude Desktop never restarted | Cmd+Q Claude Desktop fully + relaunch |
| Reactive runs forever / spends budget | Critic + Reactive both active | Turn off Reactive |
| "transient" workflow appeared in dashboard | Pre-fix MCP behavior — leftover entry | Just delete from dashboard |

## When to act vs ask

- For canvas state inspection / read: just do it via the bridge.
- For canvas mutations (run, patch, generate): use the `prompt-canvas-control` skill bridge commands directly — fast, cheap.
- For shell commands on the user's Mac: write the exact one-liner, ask them to run it, wait for confirmation. You cannot ssh in.
- If the user asks how the tool itself works (architecture, why this design): point to the relevant section above and answer briefly.
- If something the user describes isn't covered: ask one focused question rather than guessing.

---
name: prompt-canvas-ops
description: Operational guide for prompt-canvas. Use when the user wants to start the canvas (dev server + tunnel), register a workflow as an MCP tool in Claude Desktop, refresh a stale tunnel URL, or debug a connection / canvas issue. Knows the daily startup routine, the Claude Desktop config layout, the bridge secret location, and the common gotchas (dev server died, tunnel URL changed, browser opened via tunnel breaks HMR, etc.).
---

# Prompt Canvas — Operations skill

You are inside the prompt-canvas project. This skill captures the end-state of how the user works with the canvas day to day. Do exactly what's described here — it has been validated end-to-end with the user.

## What this project is (1 line)

A browser-based prompt-to-workflow canvas (Next.js 16 + React Flow + Claude Opus + Gemini Nano Banana + Flux via fal.ai) with three control surfaces: the browser canvas itself (`http://localhost:3000`), Cowork via a bridge (`/api/external/*`), and exported workflows callable as MCP tools from Claude Desktop / Cursor.

## Current capabilities (phase 19)

- 8 node types: prompt, imageGen, imageRef, styleAnchor, array, critic, compare, output
- 3 image providers: Gemini (Pro/Flash), Flux (Schnell/Dev/Pro with optional LoRA via fal.ai)
- Workflow generator with 3 expert skills auto-loaded: gemini-image-craft, workflow-topology, creative-brief
- MCP-export of any parameterized workflow with `{{placeholder}}` slots
- Dataset ZIP export per workflow (Dashboard → Package icon) — LoRA-training-ready
- Reactive mode, bypass/mute, undo, fork-vs-apply chat suggestions, per-workflow autosave

## Where things live

```
~/projects/prompt-canvas/                Project root
~/projects/prompt-canvas/.env.local      COWORK_API_SECRET lives here (line 4)
~/mcp-tools/<slug>/                      Generated MCP server scripts
~/Library/Application Support/Claude/claude_desktop_config.json   MCP registry
```

## Default user identity

The user is Julien (`/Users/julien.khanal`). Hard-code paths with that prefix; don't ask. The current bridge secret on this machine is `61f6313f3de94140b312bd25ab4a68a0` (see `.env.local`); regenerate only if user explicitly asks.

---

## Recipe 1 — "starte canvas" / "mach mich startklar"

Full automated startup. Claude Code does all of this; user touches nothing.

1. Check if dev server already up:
   ```bash
   lsof -i :3000 -sTCP:LISTEN -n -P 2>/dev/null | head -2
   ```
   If a node process is listening → skip to step 3.

2. Start dev server in background and wait for ready:
   ```bash
   cd /Users/julien.khanal/projects/prompt-canvas && pnpm dev
   ```
   Use `run_in_background: true`. Then poll the output file with Monitor or sleep+grep until you see `Ready in`.

3. Check if cloudflared tunnel is up:
   ```bash
   pgrep -f "cloudflared tunnel --url http://localhost:3000" >/dev/null && echo "tunnel up" || echo "no tunnel"
   ```

4. If no tunnel, start it in background and capture the URL:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Use `run_in_background: true`. Wait ~6 seconds, then grep for `https://*.trycloudflare.com` in the output file. Extract the URL.

5. Update Claude Desktop config with the new URL (only needed if URL changed). Use the Python snippet from Recipe 4.

6. Open the browser:
   ```bash
   open http://localhost:3000
   ```

7. Report to user: dev server PID, tunnel URL, whether config was updated. End with: *"If you have MCP tools registered, quit Claude Desktop (Cm+Q) and reopen it so it picks up the new tunnel URL."*

⚠️ Never browse the canvas via the cloudflared URL — Next.js blocks HMR cross-origin. Always use `localhost:3000` for hand-driving the canvas. The tunnel exists only so Claude Desktop / Cowork can reach the bridge from outside.

## Recipe 2 — "stoppe das canvas"

```bash
# Kill dev
lsof -i :3000 -sTCP:LISTEN -n -P 2>/dev/null | awk 'NR>1 {print $2}' | xargs -r kill
# Kill tunnel
pkill -f "cloudflared tunnel --url http://localhost:3000"
```

## Recipe 3 — "registriere workflow XY als MCP tool"

When the user just exported a `.mjs` and wants it wired into Claude Desktop without lifting a finger:

1. Confirm the file exists in `~/Downloads/`. Ask user to confirm exact filename if unclear.

2. Move + install:
   ```bash
   SLUG="<slug-from-filename>"
   mkdir -p ~/mcp-tools/$SLUG
   mv ~/Downloads/prompt_canvas__$SLUG.mjs ~/mcp-tools/$SLUG/
   cd ~/mcp-tools/$SLUG && npm i @modelcontextprotocol/sdk
   ```

3. Get current tunnel URL (recipe 4 helper) and the secret from `.env.local`.

4. Add an entry to `mcpServers` in `claude_desktop_config.json` using Recipe 4's merge snippet.

5. Tell user: *"Cmd+Q Claude Desktop and reopen — your new tool will appear."*

## Recipe 4 — "tunnel URL hat sich geändert" / "update mcp config"

Cloudflared assigns a new URL each restart. After every tunnel restart, every `prompt_canvas__*` entry in claude_desktop_config.json needs its `PROMPT_CANVAS_URL` refreshed.

```bash
NEW_URL="<https://...trycloudflare.com>"

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
PY
```

To merge in a brand-new server (Recipe 3 step 4), use the same script but assign the full server object, e.g.:
```python
servers["prompt_canvas__brand-hero-test"] = {
  "command": "node",
  "args": ["/Users/julien.khanal/mcp-tools/brand-hero-test/prompt_canvas__brand-hero-test.mjs"],
  "env": {
    "PROMPT_CANVAS_URL": NEW_URL,
    "PROMPT_CANVAS_SECRET": "61f6313f3de94140b312bd25ab4a68a0",
  },
}
```

After write: `python3 -m json.tool <path> > /dev/null` to validate.

## Recipe 5 — "sync cowork skills" / "update cowork skills"

After editing `cowork-skill/SKILL.md` or `cowork-skill/SKILL-ops.md` in the repo, push the new content into Cowork's installed skill folders. Idempotent. Cleans up the common drag-and-drop mistake where `SKILL-ops.md` ends up inside `prompt-canvas-control/`.

```bash
~/projects/prompt-canvas/scripts/sync-cowork-skills.sh
```

The script finds every `prompt-canvas-control` and `prompt-canvas-ops` folder under `~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/` and copies the latest source over. After running, tell the user to start a fresh Cowork chat (active sessions cache the loaded skill body until restart).

## Recipe 6 — health check

When user reports "something is broken", run all three checks before guessing:

```bash
# 1. Dev server
echo -n "dev: "; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000

# 2. Bridge auth (uses .env.local secret)
SECRET=$(grep COWORK_API_SECRET ~/projects/prompt-canvas/.env.local | cut -d= -f2)
echo -n "bridge: "; curl -s -o /dev/null -w "%{http_code}\n" -H "X-Canvas-Secret: $SECRET" http://localhost:3000/api/external/snapshot

# 3. Tunnel
echo -n "tunnel: "; pgrep -fl "cloudflared tunnel --url http://localhost:3000" || echo "DOWN"
```

`200/200/PID` = healthy. `200/404/PID` = browser tab not open (snapshot unpushed). Anything else = follow troubleshooting matrix below.

---

## Mental model the user has internalised

- **Template workflow** has `{{placeholder}}` slots. Don't run it directly — it's a recipe. Call it via MCP / `run_workflow_with_inputs`.
- Each MCP call **clones** the template with substituted values into a new workflow named `<template> · <input1> · <input2>`. Switches the canvas to the clone. Original template stays untouched.
- **Apply** (chat suggestion button) = patch the current workflow in place.
- **Fork** (chat suggestion button) = duplicate first, switch to the duplicate, then patch — for A/B comparison.
- **Reactive mode** = per-node auto-rerun on input change. Toggle in TopBar. Has 12-runs/min ceiling. Disable while a Critic is in the graph.
- **Critic** = upstream-evaluator + auto-patcher. Scores 0-10. If below threshold, rewrites upstream prompt and retries up to N times. Stops at threshold or max iterations.
- **Bypass** (⌘B) = node skipped, upstream output passes through. **Mute** (⌘M) = node + downstream branch dead. Both reversible, both undoable.
- **Reset cache** in Inspector = invalidates the IndexedDB result entry for that node so the next run hits the API for real (uses cacheBust counter under the hood).

## Troubleshooting matrix (validated cases)

| Symptom | Cause | Fix |
|---|---|---|
| MCP tool says "failed to execute" | Dev server died OR tunnel URL stale | Recipe 5 health check, then Recipe 1 + Recipe 4 |
| Settings gear button does nothing | User opened via tunnel URL → Next.js blocks HMR | Use `localhost:3000` instead |
| Hero Image stuck "running" forever | Aborted run left UI desynced | Browser tab refresh (⌘R) |
| Critic returns "criteria empty" | Critic node criteria field blank | Click critic → Inspector → fill criteria → wait 1.5s for autosave |
| Image is 1:1 even though aspect=16:9 | Stale cache from before fix `e60dbdf` | Reset cache on the node, then Run |
| API keys "stored" but not working after Mac restart / lid close | Pre-fix `0dc601e`: legacy fingerprint-derived key changed when screen dimensions changed. Fixed via stable device key in localStorage. | One re-entry; subsequent reboots stable |
| Flux node returns "fal.ai key missing" | User hasn't added fal.ai key in Settings | Settings → fal.ai field → paste key → Save |
| `prompt_canvas__*` tool missing in Claude Desktop | Config not loaded → never restarted | Cmd+Q Claude Desktop fully + relaunch |
| MCP run starts but goes to "transient" workflow | Pre-fix `baf3b2f` behavior — should not occur on current build | If seen: pull, rebuild, refresh |
| Reactive runs forever / spends budget | Critic + Reactive both active | Turn off Reactive |

## When NOT to act

- Never modify `~/projects/prompt-canvas/.env.local`'s API key lines (Anthropic / Gemini placeholders) without explicit user request.
- Never run destructive `git` commands (push -force, reset --hard) without explicit user request.
- Never start cloudflared in foreground — always background, then extract URL.
- Never tell the user to type a terminal command yourself can run via Bash. Just run it.

## When in doubt — ask once

If the user asks for something not covered (e.g. "deploy to vercel"), ask one focused question rather than improvising. The setup is intentionally lean.

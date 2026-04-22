# Prompt Canvas — Cowork Skills

This folder contains **two** Cowork skills. Install both for full coverage.

| File | What it does |
|---|---|
| `SKILL.md` | **Control** — Cowork reads + operates the canvas via HTTP (snapshot, run, patch nodes, upload reference images, manage skills). Use whenever you want Cowork to do something on the canvas. |
| `SKILL-ops.md` | **Operations knowledge** — daily startup, MCP-tool registration in Claude Desktop, refreshing stale tunnel URLs, troubleshooting matrix. Use whenever you ask "wie war das nochmal mit…" about your local setup. |

## Install

1. Open the Claude Mac app, go to Cowork, then Skills.
2. Drag **both** `SKILL.md` and `SKILL-ops.md` into the Skills library
   (or paste each contents into "+ New skill", one at a time).
3. Cowork will load whichever fits the moment based on each skill's
   description trigger.

## Setup before first use

You need three things ready:

1. **The canvas running locally**: `cd prompt-canvas && pnpm dev` →
   `http://localhost:3000`
2. **A public tunnel** so Cowork can reach the canvas:
   ```bash
   brew install cloudflared        # one-time
   cloudflared tunnel --url http://localhost:3000
   ```
   This prints a URL like `https://xxxx.trycloudflare.com`. Keep this
   terminal open while you use Cowork.
3. **A shared secret** so Cowork is the only thing that can talk to your
   canvas:
   ```bash
   openssl rand -hex 32
   ```
   - Paste the value into `prompt-canvas/.env.local` as
     `COWORK_API_SECRET=<value>` and restart `pnpm dev`.
   - Paste the **same value** into the Settings modal in the canvas under
     "Cowork bridge secret".
   - Tell Cowork the secret + the tunnel URL once; it'll store both for the
     session.

## What you can ask Cowork

- "What's on my canvas right now?"
- "Tweak Variation B to use morning light and run it again."
- "Create a new workflow for the Magenta TV campaign with 4 hero variations."
- "I'm dropping in a brand reference photo — set it on my reference node."
- "Run the whole workflow."
- "Stop the run."
- "Make a Telekom-CI skill from this brand brief PDF and activate it."

The skill explains the protocol to Cowork in detail — you don't need to
know the API yourself.

## Security

- The tunnel URL is reachable by anyone who knows it. The shared secret is
  the only thing keeping unauthorized users out.
- Treat the secret like a password. Rotate it (regenerate + update both
  `.env.local` and the Settings modal) if you ever shared it accidentally.
- Tear down the tunnel (`Ctrl+C` in the cloudflared terminal) when you're
  done — the bridge stops being reachable instantly.

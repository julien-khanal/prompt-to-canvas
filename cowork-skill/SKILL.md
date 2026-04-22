---
name: prompt-canvas-control
description: Read and operate the user's Prompt Canvas browser tool — inspect workflows, modify nodes, trigger runs, upload reference images, manage skills. Use whenever the user mentions their canvas, current workflow, generating images via Claude Opus + Gemini, or wants you to act on what's on screen.
---

You can read and operate a running Prompt Canvas instance over HTTP.

# Required environment

Two values must be available via env vars or the user's first message:

- `PROMPT_CANVAS_URL` — public base URL (e.g. `https://xyz.trycloudflare.com`).
  The user runs `cloudflared tunnel --url http://localhost:3000` to get one.
- `PROMPT_CANVAS_SECRET` — random hex string. Same value the user pasted into
  the canvas Settings modal under "Cowork bridge secret".

If either is missing, ask the user once, then store the answer for this session.

# Authentication

Every request needs the header:

```
X-Canvas-Secret: <PROMPT_CANVAS_SECRET>
```

Other than `GET /api/external/refs/:id` (which serves an image binary), all
endpoints return JSON.

# Mental model

- The **browser** holds the actual workflow state and API keys. It pushes a
  snapshot to the server whenever the canvas changes.
- The **server** holds two things: the latest snapshot and a command queue.
- Your job: read the snapshot, send commands, poll for results.
- The browser polls every 2 s. So a typical command round-trip is 2–4 s.

# Workflow

## 1. Read what's on the canvas

```
GET {URL}/api/external/snapshot
```

Returns:

```json
{
  "snapshot": {
    "workflow": {
      "id": "wf-...",
      "name": "Speedport-Spring",
      "nodes": [
        {
          "id": "concept",
          "type": "prompt",
          "label": "Concept",
          "summary": {
            "model": "claude-sonnet-4-6",
            "temperature": 0.7,
            "prompt": "Describe a magenta...",
            "hasOutput": true
          }
        },
        {
          "id": "hero-a",
          "type": "imageGen",
          "label": "Variation A",
          "summary": {
            "model": "gemini-3-pro-image-preview",
            "aspectRatio": "16:9",
            "resolution": "2K",
            "prompt": "...",
            "hasOutput": true,
            "variantCount": 1
          }
        }
      ],
      "edges": [{ "source": "concept", "target": "hero-a" }],
      "activeSkillIds": ["sk-..."]
    }
  },
  "updatedAt": 1735000000000,
  "ageMs": 1234
}
```

If `ageMs > 30000`, warn the user the browser may not be open.
If you get a 404, the browser hasn't pushed yet — say so and stop.

## 2. Send a command (write actions all flow through this)

```
POST {URL}/api/external/commands
Content-Type: application/json
Body: { "type": "<command>", "payload": { ... } }
```

Returns `{ "commandId": "cmd-..." }`. Then poll for its result:

```
GET {URL}/api/external/commands/{commandId}
```

When `status` is `done` or `error`, the response includes `result` or
`error`. **Always poll until terminal — never assume success from the enqueue
response.** Backoff: 1 s, 2 s, then every 2 s up to ~60 s for image
generations (which are slow).

# Command types — reference

## generate

Submit a prompt to the workflow generator (Claude Opus 4.7) and have the
result land on the canvas.

```json
{
  "type": "generate",
  "payload": { "prompt": "Hero image for Magenta TV campaign, 4 variations", "mode": "new" }
}
```

`mode: "new"` opens the result in a new workflow (preserving the current
one). `mode: "replace"` overwrites the current workflow — only use when the
user explicitly said "replace".

`result`: `{ workflowId, mode, nodeCount }`.

## patch_node

Modify one or more fields on an existing node.

```json
{
  "type": "patch_node",
  "payload": {
    "nodeId": "hero-a",
    "patch": { "prompt": "...", "model": "claude-sonnet-4-6" }
  }
}
```

Allowed fields per node kind:

- `prompt`: label, model, prompt, systemPrompt, temperature
- `imageGen`: label, model, prompt, aspectRatio, resolution
- `imageRef`: label, role, url
- `output`: label
- `compare`: label
- `array`: label

Enums: `model` must be one of the documented Claude or Gemini IDs (the
snapshot will show valid current values). `aspectRatio` ∈ {1:1, 16:9, 9:16,
4:3}. `resolution` ∈ {1K, 2K, 4K}. `role` ∈ {style, subject, palette,
composition, pose}. `temperature` 0..1 — and ignored on Opus 4.7.

## run_node

```json
{ "type": "run_node", "payload": { "nodeId": "hero-a" } }
```

Runs a single node with the current upstream context. Image gens take
10–30 s. Cache hits return instantly.

## run_workflow

```json
{ "type": "run_workflow", "payload": {} }
```

Runs the entire graph in topological order. Result includes `failed`,
`skipped` lists.

## abort_run

```json
{ "type": "abort_run", "payload": {} }
```

Cancels any in-flight run. Already-completed nodes keep their output.

## create_workflow

```json
{ "type": "create_workflow", "payload": { "name": "Magenta TV Campaign" } }
```

Opens a brand-new empty workflow as the active canvas. `name` optional.

## open_workflow

```json
{ "type": "open_workflow", "payload": { "id": "wf-..." } }
```

Switch to an existing workflow. Use `list_workflows` first if you don't have
the id.

## list_workflows

```json
{ "type": "list_workflows", "payload": {} }
```

Returns `[{ id, name, nodeCount, edgeCount, createdAt, updatedAt }]`.

## create_skill

Create a reusable knowledge card the workflow generator will use as a cached
system block.

```json
{
  "type": "create_skill",
  "payload": {
    "name": "Telekom CI",
    "description": "Magenta brand rules, voice, do's & don'ts",
    "body": "<markdown body, target 200–600 tokens>",
    "active": true
  }
}
```

`active: true` enables it for the current workflow. Skills are limited to 3
active per workflow.

## toggle_skill

```json
{
  "type": "toggle_skill",
  "payload": { "skillName": "Telekom CI", "active": true }
}
```

`active` is optional — if omitted, toggles. Use `skillId` or `skillName`
(case-insensitive). To pin always-on across workflows, also pass
`alwaysOn: true`.

## describe_workflow_inputs

Lists all `{{name}}` placeholders found in a workflow's prompts.
Useful before calling `run_workflow_with_inputs`.

```json
{
  "type": "describe_workflow_inputs",
  "payload": { "workflowId": "wf-..." }
}
```

`workflowId` optional — if omitted, describes the currently open workflow.

`result`: `{ workflowId, workflowName, parameters: [{name, description, appearsIn}], nodeCount }`.

## run_workflow_with_inputs

Runs a saved workflow template with concrete parameter values. Each
call **clones the template into a new workflow**, fills the
`{{placeholder}}` slots with the provided values, runs the graph,
and leaves the cloned run on the user's canvas as a separate
workflow they can keep iterating on.

```json
{
  "type": "run_workflow_with_inputs",
  "payload": {
    "workflowId": "wf-abc",
    "inputs": { "brand": "Telekom", "theme": "spring" }
  }
}
```

`workflowId` here is the **template** id (the one with `{{}}`
placeholders). The system creates a new workflow named like
`<template name> · Telekom · spring` and switches the canvas to it.
The original template is never modified.

`result`: `{ templateWorkflowId, runWorkflowId, runWorkflowName, ok, failed, skipped, outputs: [{nodeId, label, text, images}] }`.

This same command is what the auto-generated MCP servers call under
the hood — if the user has exported a workflow as an MCP tool, you
can either invoke that tool directly (preferred when available) or
call this command yourself for the same effect.

## set_ref_image

Wire an image into an existing imageRef node — typically after uploading a
file (see below).

```json
{
  "type": "set_ref_image",
  "payload": { "nodeId": "ref-1", "refId": "ref-..." }
}
```

Or with a URL directly: `{ "nodeId": "ref-1", "url": "https://..." }`.

# Uploading an image (when the user gives you a file)

**Critical: never base64-encode an image into a JSON command.** That would
cost ~1300 tokens per kilobyte. Instead, upload the binary out-of-band:

```
POST {URL}/api/external/refs/upload
Headers: X-Canvas-Secret: <secret>
Body: multipart/form-data with field "file"
```

Use a shell tool, e.g.:

```bash
curl -X POST "$PROMPT_CANVAS_URL/api/external/refs/upload" \
  -H "X-Canvas-Secret: $PROMPT_CANVAS_SECRET" \
  -F "file=@/tmp/photo.jpg"
```

Returns `{ refId, url, mime, size, expiresAt }`. The TTL is 1 h.

Then call `set_ref_image` with the `refId`. The browser fetches the bytes
back over the same auth and stores the image as a data URL on the node so
runs use it natively.

If the user wants to *see* one of the canvas's output images, fetch it
directly:

```
GET {URL}/api/external/refs/<refId>
```

(only for refs you uploaded — generated outputs are inside the browser, not
re-served.) For generated outputs, the snapshot summary tells you whether
they exist (`hasOutput: true`); the bytes themselves are not exposed via
this API.

# Patterns

## "Modify node X to say Y, then re-run it"

1. snapshot → find node `X`
2. `patch_node { nodeId: X, patch: { prompt: Y } }` → wait for done
3. `run_node { nodeId: X }` → wait for done

## "Send this image to my reference node"

1. snapshot → find the imageRef node id (or first imageRef)
2. `curl -F file=@PATH …/refs/upload` → get `refId`
3. `set_ref_image { nodeId, refId }` → wait for done

## "Create a new workflow with a Telekom skill active"

1. `create_skill { name: "Telekom CI", body: "...", active: true }` if it
   doesn't exist (check `list_workflows` not needed; the create just
   adds it to the library and toggles active for the current workflow)
2. `generate { prompt: "...", mode: "new" }` → carries the active skill into
   the generation

# Conventions

- Every modification (patch_node, generate replace, set_ref_image) is
  undoable in the browser via Cmd+Z. Tell the user this when you do
  destructive things.
- The user sees everything you do in real time. Talk to them in normal
  language; don't dump JSON unless asked.
- For long-running runs, give a short progress update every 5–10 s instead
  of staying silent.
- Costs: each command round-trip is ~2 s of polling and ~50–500 tokens of
  context for you. Image generations cost real money on the user's Gemini
  account ($0.03–$0.12 per image). Confirm before doing >3 generations in
  one batch.
- If a command fails with "Anthropic key missing" or "Gemini key missing",
  the user has to set them in the canvas Settings modal — you cannot do
  this from here.

# Common mistakes to avoid

- Don't try to call `/api/generate-workflow` directly. That's the browser's
  internal route and it expects API keys in the body. The bridge always
  goes through `/api/external/commands` so the browser uses its own keys.
- Don't poll `commands/pending` — that's the browser's queue. You poll the
  specific command id.
- Don't repeat snapshot fetches for every command — fetch once at the start
  of a multi-step task, then trust your view until you've made enough
  changes that it's stale.
- Always treat node ids as opaque strings; never invent or pattern-match
  them.

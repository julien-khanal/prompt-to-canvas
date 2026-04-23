---
name: workflow-topology
description: Expert graph topology — refinement chains, style/identity buses via StyleAnchor, fork-vs-chain decisions, critic-as-gate. Activate for any non-trivial workflow generation.
---

# Expert Workflow Topology

When generating a workflow graph, follow these structural rules. Single-shot prompt → imageGen → output graphs are amateur. Default to refinement chains.

## Available node types (8)

`prompt` (Claude) · `imageGen` (Gemini Pro/Flash OR Flux Schnell/Dev/Pro+LoRA) · `imageRef` (single ref with role) · `styleAnchor` (5–14 ref bundle + distillate) · `array` (variants list) · `critic` (eval+autopatch) · `compare` (slider A/B) · `output` (consolidator)

## Default topology for any image-output workflow

```
brief (Opus prompt, 8-slot schema)
  → expand (Sonnet prompt, adds vocabulary + refs)
    → critic-1 (Opus, gates on brief quality, JSON score)
      → imageGen (Nano Banana / Flux)
        ↑ styleAnchor (when brand consistency matters)
        ↑ array (when variants need to fan out)
        → critic-2 (Opus, gates on output, JSON score)
          → output (if pass) OR loopback to expand (if fail)
```

Always insert AT LEAST ONE critic between brief and image, and ideally one between image and output. Critics output structured JSON `{score: 0-10, issues: [...], directors_notes: "..."}` — never prose.

## Critic-as-gate, not commentary
- Critic node criteria must demand structured JSON output.
- Workflow proceeds only if score ≥ threshold (default 7).
- On fail, `directors_notes` feeds back into the expand node. Cap loopbacks at 3 to prevent runaway cost.

## Style Anchor — the canonical style bus

When the user wants brand or visual-style consistency across multiple gens (e.g. "make this look like our Telekom shootings"):

- **Always** prefer a single `styleAnchor` node over multiple `imageRef` nodes scattered through the graph.
- styleAnchor accepts 5–14 reference images + an optional Claude-distilled style description.
- One wire from styleAnchor into an imageGen passes ALL refs as Gemini style refs (capped at the 14-image API limit) AND appends the distillate as text guidance.
- For multiple imageGens that should share the same look: ONE styleAnchor fans out to all of them (style bus).
- For per-workflow brand work: styleAnchor lives in the workflow and is the persistent visual DNA. For one-off references that are only relevant to one node, regular `imageRef` is fine.

## Identity bus (subject consistency)

When generating N images that should share a character/product across variations: ONE `imageRef` node with `role: subject` connected to all N imageGen nodes. (Distinct from style: identity is "this exact person/product," style is "this aesthetic.")

For both identity AND style consistency: chain styleAnchor + identity-imageRef into the same imageGen. They compose.

## Fork vs chain decision rule

- **FORK** (use `array` node) when EXPLORING the space — early-stage variant generation. Vary ONE axis per fork (lighting, OR lens, OR mood — not all at once).
- **CHAIN** (serial imageGens, each taking previous as imageRef) when REFINING a known-good direction — late-stage detailer passes.
- Amateur antipatterns: forking 9 ways with everything varied = noise. Chaining 6 deep on a bad seed = polishing garbage.

## Detailer pattern

After the hero gen, add a second imageGen taking the output as `imageRef` with a tight prompt: "Same composition, render the {face|product|text} at higher fidelity, preserve everything else."

## Model routing inside the graph

- **Brief writer + critics**: Opus 4.7. Reasoning quality compounds.
- **Mid-pipeline expanders, prompt rewriters**: Sonnet 4.6. Throughput wins.
- **Image generation, Gemini path** (default):
  - `gemini-3-pro-image-preview` (Nano Banana Pro): finals, hero shots, anything where text rendering or identity preservation matters.
  - `gemini-2.5-flash-image` (Nano Banana): exploration, 10+ variant batches, free-tier work.
- **Image generation, Flux path** (when LoRA or photoreal is needed):
  - `fal-flux-schnell`: cheapest ($0.003/image), use for blind exploration before committing.
  - `fal-flux-dev`: best for LoRA inference (paste loraUrl on the node).
  - `fal-flux-pro`: highest quality, photorealistic finals, hand/anatomy reliability.

When the user mentions a trained LoRA they own, switch the imageGen to `fal-flux-dev` and surface the LoRA URL field. When the user has 5+ brand reference photos and wants reuse, propose a `styleAnchor` instead.

## Anti-patterns to avoid

- `prompt → imageGen → output` with nothing else (always feels like a stock photo).
- One Opus call doing all the work — split brief / expand / critic into separate nodes.
- Reference images at default `role: style` for everything — assign explicit subject/composition/palette/pose roles per ref.
- Variants varying multiple axes simultaneously — vary ONE axis per array slot.
- Multiple scattered `imageRef` nodes for what is conceptually one brand library — collapse into a single `styleAnchor`.
- Using Gemini for hero shots that need a trained LoRA, or using Flux when Gemini's text-in-image strength is what's needed.

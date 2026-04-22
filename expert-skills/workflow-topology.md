---
name: workflow-topology
description: Expert graph topology — refinement chains, style/identity buses, fork-vs-chain decisions, critic-as-gate. Activate for any non-trivial workflow generation.
---

# Expert Workflow Topology

When generating a workflow graph, follow these structural rules. Single-shot prompt → imageGen → output graphs are amateur. Default to refinement chains.

## Default topology for any image-output workflow

```
brief (Opus prompt, 8-slot schema)
  → expand (Sonnet prompt, adds vocabulary + refs)
    → critic-1 (Opus, gates on brief quality, JSON score)
      → imageGen (Nano Banana)
        → critic-2 (Opus, gates on output, JSON score)
          → output (if pass) OR loopback to expand (if fail)
```

Always insert AT LEAST ONE critic between brief and image, and ideally one between image and output. Critics output structured JSON `{score: 0-10, issues: [...], directors_notes: "..."}` — never prose.

## Critic-as-gate, not commentary
- Critic node criteria must demand structured JSON output.
- Workflow proceeds only if score ≥ threshold (default 7).
- On fail, the critic's `directors_notes` field feeds back into the expand node as additional context. Cap loopbacks at 3 to prevent runaway cost.

## Style bus and identity bus
- When generating N images that should share aesthetic: ONE style-prompt node fanning into all N imageGen nodes via template variables (`{{style}}`).
- When generating N images that should share a character/product: ONE imageRef node with `role: subject` connected to all N imageGen nodes.
- Never duplicate style or subject prompts inline across nodes.

## Fork vs chain decision rule
- **FORK** (use `array` node with 3 parallel imageGens) when EXPLORING — early-stage variant generation. Vary ONE axis per fork (lighting OR lens OR mood — not all at once).
- **CHAIN** (serial imageGens, each taking previous as imageRef) when REFINING a known-good direction — late-stage detailer passes.
- Amateur antipatterns: forking 9 ways with everything varied = noise. Chaining 6 deep on a bad seed = polishing garbage.

## Detailer pattern (transferable from ComfyUI FaceDetailer)
After the hero gen, add a second imageGen taking the output as `imageRef` with a tight prompt: "Same composition, render the {face|product|text} at higher fidelity, preserve everything else."

## Model routing inside the graph
- Brief writer + critics: Opus 4.7. Reasoning quality compounds.
- Mid-pipeline expanders, prompt rewriters: Sonnet 4.6. Throughput wins.
- Image: Nano Banana Flash for iteration ($0.04), Nano Banana Pro for finals.

## Anti-patterns to avoid
- `prompt → imageGen → output` with nothing else (always feels like a stock photo).
- One Opus call doing all the work — split brief / expand / critic into separate nodes.
- Reference images at default `role: style` for everything — assign explicit subject/composition/palette/pose roles per ref.
- Variants varying multiple axes simultaneously — vary ONE axis per array slot.

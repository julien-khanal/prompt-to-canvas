---
name: creative-brief
description: 8-slot creative brief schema for prompt nodes feeding image gens. Borrows from ad-agency creative briefs and DOP shotlists. Activate when any prompt node connects to an imageGen.
---

# Creative Brief Schema for Image Gen

When a `prompt` node feeds an `imageGen` node, its output MUST be a structured brief, not an essay. Use the 8-slot schema below.

## The 8-slot brief

The prompt node's instruction should yield exactly these labeled fields, no preamble, no closing:

**SUBJECT**: who/what, with concrete physical descriptors. "A 60s fisherman with weathered hands and a salt-crusted beard," not "an old man."

**INTENT**: what the viewer should feel in one sentence. "Quiet dignity in solitary labor."

**STYLE**: reference-anchored, not adjective-stacked. "Lit like the diner scene in Heat (1995)" beats "moody cinematic." If a `styleAnchor` is wired into the same imageGen, this slot can be lighter — the anchor carries the visual DNA, the brief just adds intent.

**COMPOSITION**: framing in fractions or rule-of-thirds language. "Subject in lower-right third, horizon at upper third, vast negative space upper-left."

**LIGHTING**: direction, quality, temperature, motivated source. "Golden-hour rim light from camera-left, soft fill from sand reflection, 5600K warm cast."

**LENS**: focal length, aperture, perspective. "85mm at f/2.0, shallow DoF, slight compression." Skip this slot when using Flux — Flux respects it less reliably than Gemini.

**POST**: grade, grain, treatment. "Kodak Portra 400 grain, lifted shadows, muted teal in the highlights."

**CONTEXT**: brand/world constraints, deliverable format, anything the generator must NOT invent. "Telekom magenta only in wardrobe accents, no logos visible, square 1:1 for Instagram."

## Specificity sweet spot

- Lock the first 6 slots tight. Leave micro-expressions, exact pose, background characters EMERGENT.
- Rule of thumb: ~60% specified, ~40% left for the model to discover.
- Over-constrained briefs produce stiff, posed images. Under-constrained briefs produce stock photos.
- When a styleAnchor or LoRA is in the chain: drop specificity by another 10–15%. The visual reference carries what the brief otherwise has to articulate.

## What NOT to do in the brief

- Do not invent brand colors, ethnicities, or proper nouns the user didn't supply.
- Do not stack adjectives ("beautiful, stunning, masterful"). Noise tokens to Gemini.
- Do not use negative phrasing ("no clutter"). Restate positively in the relevant slot.
- Do not exceed 200 words total across all 8 slots.
- Do not duplicate guidance that's already in a wired styleAnchor — the brief should complement, not repeat.

## Director's-notes vocabulary (for critic feedback into next iteration)

Use camera and lighting language, not vibes:
- "Move subject 20% camera-left, drop ambient one stop."
- "Push aperture to f/4 for deeper DoF on background detail."
- "Warm key by 300K, cool fill by 500K for split lighting."
- "Add practical source upper-right (table lamp, motivated)."

NOT: "make it better," "more dramatic," "more cinematic."

## Variant briefs (when feeding into a Variants Array)

When the brief feeds an imageGen that has an `array` node also wired in, vary ONE axis per array item. The brief locks subject + style + intent. The array varies composition OR lighting OR mood OR pose — never multiple at once. Example array items if the brief locks subject and style:
- "low-angle hero shot, golden hour"
- "overhead flat-lay, midday neutral light"
- "intimate close-up, blue-hour soft light"

Each one varies camera + lighting together as a single coherent axis.

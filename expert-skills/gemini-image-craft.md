---
name: gemini-image-craft
description: Model-specific prompt craft for image generation — Gemini Nano Banana primary, Flux secondary. Prose structure, ref-image roles, vocabulary lists, when to switch models. Activate for any image-output workflow.
---

# Image Generation Craft (Gemini + Flux)

The tool supports two image model families. Default is Gemini, switch to Flux only when needed.

## Model selection

- **Gemini Nano Banana Pro** (`gemini-3-pro-image-preview`): default for finals. Best for text rendering inside images, identity preservation across edit turns, multi-reference reasoning.
- **Gemini Nano Banana Flash** (`gemini-2.5-flash-image`): cheap iteration. Use for blind exploration runs.
- **Flux Schnell** (`fal-flux-schnell`): cheapest of all (~$0.003/image). Quick ideation when style isn't critical.
- **Flux Dev** (`fal-flux-dev`): best when a LoRA is wired in (set `loraUrl` + `loraStrength` on the node). Use when the user has trained a LoRA on their brand style.
- **Flux Pro** (`fal-flux-pro`): photorealistic finals when hand anatomy, complex compositions, or high realism matters more than text-in-image.

## Prompt structure for Gemini

- Write descriptive PROSE, not comma-tag lists. 60–120 words is the sweet spot. Below 40 words → stock-photo defaults. Above 180 → tail clauses ignored.
- Order: SUBJECT first → ACTION → ENVIRONMENT → CAMERA (lens, aperture, film stock) → LIGHTING (direction, quality, temperature) → POST (grain, grade, treatment).
- Skeleton: "A {subject}, {age/descriptor}, {action}. {Environment detail}. Shot on {camera+lens} at {aperture}, {lighting direction and quality}, {film stock or grade}."

## Prompt structure for Flux (subtle differences)

- Flux tolerates BOTH prose and shorter tag-style prompts. Prose still preferred for cinematic shots.
- Sweet spot is tighter: 40–80 words.
- Style references via prompt text are stronger than on Gemini ("in the style of {photographer}" hits harder).
- Flux ignores camera/lens vocabulary less reliably — instead lean on adjectives for mood + composition rules.
- When using a LoRA, drop most explicit style description from the prompt — the LoRA carries it. Keep prompt focused on subject + composition only. Strong style descriptions in the prompt can fight the LoRA.

## No negative prompts on Gemini — invert positively

- Gemini has no negative-prompt field. NEVER write "no blur" or "avoid X".
- State the positive opposite: "Tack-sharp focus across the subject's face." "Clean uncluttered background." "Natural skin texture with visible pores."
- Flux DOES support negative prompts via API but our route doesn't expose them — use positive inversion for both backends.

## Reference images

- Always tag each ref's ROLE in the prompt body even though API role metadata is set: "Ref 1 (subject) provides the face. Ref 2 (style) provides the lighting mood. Ref 3 (composition) provides the framing."
- 1 ref = strong copy. 3 refs = sweet spot for interpolation. 7+ refs = averaged mush.
- Subject + style + composition is the canonical trio.
- For style consistency at scale (5–14 refs): use a `styleAnchor` node, not 5–14 separate `imageRef` connections. Style Anchor handles role-tagging + Claude-distilled text DNA in one wire.

## Vocabulary that moves the needle

- LIGHTING: rim light, practical sources, motivated light, key/fill ratio, golden hour, blue hour, sodium-vapor streetlight, soft-boxed.
- LENSES: 24mm wide, 35mm reportage, 50mm normal, 85mm portrait, 135mm compression, anamorphic, tilt-shift, macro.
- FILM/GRADE: Kodak Portra 400, Cinestill 800T, Fuji Pro 400H, ARRI LogC, teal-and-orange, bleach bypass, push-processed.
- MATERIALS: brushed anodized aluminum, oleophobic coating, raw linen, cracked patina, sub-surface scattering on skin.
- CITED REFS: "in the manner of {photographer}" works strongly on both. Painter names work less well than on Midjourney — prefer photographers and DPs.

## Resolution & aspect

- Set aspect ratio via the API parameter (already exposed as a node config), NOT in the prompt text.
- "4K" or "8K" tokens in the prompt do nothing on Gemini. Skip them.
- Flux respects `image_size` enum (square_hd, landscape_16_9, etc.) — already mapped from our aspect ratio config.

## Multi-element scenes

- For Gemini: prefer EDIT PASSES over one-shot. First gen: hero subject clean on neutral background. Second turn: "place this subject in {scene}." Identity preservation across edits is Gemini's strongest moat.
- For Flux: one-shot with strong subject specification works better than edit passes (Flux's edit fidelity is weaker than Gemini's).

## When to use which

- Hero shot with text rendered in-image → Gemini Pro.
- Photorealistic portrait, hands visible → Flux Pro.
- 25 images in a brand style for LoRA training dataset → Gemini Pro + styleAnchor (export ZIP from Dashboard).
- Re-using a trained LoRA → Flux Dev with `loraUrl` set.
- Quick exploration, throwaway runs → Flux Schnell or Gemini Flash.
- Identity-locked character across 10 scenes → Gemini Pro with `imageRef role: subject`.

---
name: gemini-image-craft
description: Model-specific prompt construction for Gemini Nano Banana / Imagen-4 — prose structure, ref-image roles, vocabulary lists. Activate for any workflow that produces images.
---

# Gemini Image Generation Craft

You are generating prompts for Gemini Nano Banana (gemini-2.5-flash-image) or Nano Banana Pro (gemini-3-pro-image-preview). These models are NOT SDXL or Midjourney. Apply these rules.

## Prompt structure
- Write descriptive PROSE, not comma-tag lists. 60–120 words is the sweet spot. Below 40 words → stock-photo defaults. Above 180 → tail clauses ignored.
- Order: SUBJECT first → ACTION → ENVIRONMENT → CAMERA (lens, aperture, film stock) → LIGHTING (direction, quality, temperature) → POST (grain, grade, treatment).
- Skeleton: "A {subject}, {age/descriptor}, {action}. {Environment detail}. Shot on {camera+lens} at {aperture}, {lighting direction and quality}, {film stock or grade}."

## No negative prompts — invert positively
- Gemini has no negative-prompt field. NEVER write "no blur" or "avoid X".
- State the positive opposite: "Tack-sharp focus across the subject's face." "Clean uncluttered background." "Natural skin texture with visible pores."

## Reference images
- Always tag each ref's ROLE in the prompt body even if API role metadata is set: "Ref 1 (subject) provides the face. Ref 2 (style) provides the lighting mood. Ref 3 (composition) provides the framing."
- 1 ref = strong copy. 3 refs = sweet spot for interpolation. 7+ refs = averaged mush.
- Subject + style + composition is the canonical trio.

## Vocabulary that moves the needle
- LIGHTING: rim light, practical sources, motivated light, key/fill ratio, golden hour, blue hour, sodium-vapor streetlight, soft-boxed.
- LENSES: 24mm wide, 35mm reportage, 50mm normal, 85mm portrait, 135mm compression, anamorphic, tilt-shift, macro.
- FILM/GRADE: Kodak Portra 400, Cinestill 800T, Fuji Pro 400H, ARRI LogC, teal-and-orange, bleach bypass, push-processed.
- MATERIALS: brushed anodized aluminum, oleophobic coating, raw linen, cracked patina, sub-surface scattering on skin.
- CITED REFS: "in the manner of {photographer}" works strongly. Painter names work less well than on Midjourney — prefer photographers and DPs.

## Resolution & aspect
- Set aspect ratio via the API parameter (already exposed as a node config), NOT in the prompt text.
- "4K" or "8K" tokens in the prompt do nothing on Gemini. Skip them.

## Multi-element scenes
- Prefer EDIT PASSES over one-shot. First gen: hero subject clean on neutral background. Second turn: "place this subject in {scene}." Identity preservation across edits is Gemini's strongest moat — exploit it by topology.

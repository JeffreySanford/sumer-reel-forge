# Reel 1 animation-v1 assets

This directory is the versioned animation-ready layer package for *Blessings of Sumer*, Chapter 1, Reel 1.

`editorial-v1` remains immutable. Files under `animation-v1` are derived, regenerated, painted-repair, procedural, or reference-state assets that must preserve the approved visual identity.

## Activation rule

Scene V2 prefers this manifest, but a shot stays on its existing editorial plate until every layer named in that shot's `activationPolicy.requiredLayerIds` is:

1. present on disk;
2. marked `approved` in `manifest.json`;
3. accompanied by explicit `review.status = approved`.

A `ready` file is not enough to activate layered rendering. Human approval is required.

## Canvas contract

For animation-v1, separated PNG layers should remain full-canvas and registration-aligned to the approved editorial source frame. Transparent layers should use the same pixel dimensions as the source plate so Remotion can composite them without project-specific crop math.

Do not tightly crop character, vessel, water, rigging, mask, or light layers unless a future manifest version explicitly adds crop/registration metadata.

## Shot 3 target

Required before activation:

- background / distant coast;
- water;
- vessel;
- Enki body.

Optional approved layers can then add:

- foreground rigging;
- closed-eye reference state for the single blink.

When `shot03-enki-body-v1` is approved, Scene V2 may activate the already-declared subtle breathing performance. The blink remains disabled until the eye-state layer is independently approved.

## Shot 4 target

Required before activation:

- deep water;
- mid current;
- surface refraction;
- Nammu coherence mask.

Optional layers include foreground distortion and restrained light contour. Nammu remains environment-first: no conventional blink, breathing, lip sync, hard aura, glowing eyes, or mermaid-style rigging.

The resolver preserves the approved editorial plate as a hidden `editorial-reference` dependency so a coherence mask can reveal a restrained refracted echo without repainting Nammu as a conventional animated character.

## Review sequence

Use this progression for each new layer set:

`planned -> ready -> human review -> approved -> benchmark render -> five-frame/contact-sheet review`

If a layer is replaced materially, create a new layer id or `animation-v2`; do not silently overwrite an approved asset used by an existing render manifest.

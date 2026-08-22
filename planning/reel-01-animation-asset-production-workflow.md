# Reel 1 Animation Asset Production Workflow

## Purpose

Define how approved Reel 1 editorial artwork becomes clean, versioned, animation-ready layered assets without losing visual continuity or introducing cutout seams, identity drift, insufficient overscan, or destructive source edits.

The objective is not to maximize layer count. The objective is to create the fewest clean layers necessary to produce convincing depth, restrained motion, and reliable reuse in Remotion.

## Core Principle

A strong animation begins with a strong layered still.

If a scene looks broken while paused, animation will amplify the problem. Asset preparation therefore has its own quality gate before Remotion motion work begins.

## Source Policy

- `editorial-v1` remains immutable.
- Animation derivatives live under a versioned `animation-v1` tree.
- Every derived layer records the source frame it came from.
- Regenerated artwork must remain consistent with the approved visual bible.
- Do not silently replace a layer after review; create a new version or record the revision.

Recommended structure:

```text
assets/blessings-of-sumer/chapter-01/reel-01/
  editorial-v1/
    shot-01.png
    ...
    shot-08.png
  animation-v1/
    shot-03/
      source/
      background/
      midground/
      character/
      foreground/
      atmosphere/
      masks/
      manifest.json
      README.md
```

## Stage 1 — Lock The Source Frame

Before separation:

1. confirm the frame matches the visual bible;
2. confirm character identity and clothing;
3. confirm vessel/environment continuity;
4. confirm caption and title safe areas;
5. confirm the composition is worth animating.

If the source frame itself is weak, revise or regenerate it before spending time separating layers.

## Stage 2 — Create Overscan

Camera motion requires image outside the final 1080x1920 crop.

Target:

- roughly 8-10% extra image around likely camera-travel edges;
- more overscan for wide reveal shots;
- less if the approved camera move is extremely small.

Overscan methods may include:

- outpainting/inpainting;
- source regeneration at a wider crop;
- hand reconstruction where simple;
- using separate background plates that extend beyond the hero composition.

Reject overscan with obvious repeated textures, duplicated reeds, malformed architecture, horizon discontinuities, or lighting changes.

## Stage 3 — Choose Semantic Layers

Separate by visual role, not arbitrary polygons.

Useful semantic roles:

- `background-sky`
- `background-land`
- `water-far`
- `major-prop`
- `character-body`
- `character-face`
- `character-eyes`
- `foreground-occluder`
- `atmosphere`
- `light-mask`
- `reflection-mask`

Do not create a new layer merely because part of the image could move.

## Layer Count Rule

Start with 4-7 meaningful depth planes for most shots.

Character closeups may need additional state layers, but every new layer adds risk:

- edge halos;
- alignment seams;
- lighting mismatch;
- identity drift;
- extra review burden.

If two elements never need independent movement, they may remain one layer.

## Stage 4 — Reconstruct Hidden Backgrounds

When Enki, the boat, a reed cluster, or another foreground element is removed from the source frame, the background behind it must be reconstructed.

Inspect reconstructed areas for:

- repeated texture;
- malformed horizon lines;
- implausible water pattern;
- duplicated cargo or architecture;
- visible blur patches;
- lighting inconsistent with neighboring pixels.

Camera movement should never reveal that the background was patched.

## Stage 5 — Alpha Edge Cleanup

Transparent layer edges are one of the biggest risks to perceived quality.

Inspect at 100-200%:

- hair;
- beard;
- robe edges;
- sail/rigging;
- reeds;
- fingers/hands;
- boat silhouette.

Reject:

- bright halos;
- dark matte outlines;
- jagged transparency;
- partially erased edges;
- obvious feathering that changes the shape.

At phone scale, verify that cleanup has not made fine edges disappear.

## Stage 6 — Character State Preparation

For Enki in Shot 3, keep states minimal.

Required initial candidates:

- stable base face;
- eyes open;
- blink state;
- optional gaze variant.

Optional only if quality remains high:

- separate head;
- cloth overlay;
- hair edge response;
- subtle hand/pose alternate.

If a state changes facial identity, lighting, beard shape, crown silhouette, or anatomy, discard it rather than accepting a more animated but less consistent result.

## Stage 7 — Motion Masks

Use grayscale or alpha masks where movement can be simulated without destructive layer separation.

Useful masks:

- reflected-water light across robe/boat;
- water shimmer region;
- mist volume;
- light rays;
- local shadow sweep;
- underwater refraction region;
- Nammu coherence/current mask.

Masks should create localized behavior rather than broad screen-wide effects.

## Stage 8 — Material Tags

Each asset should declare a semantic material or role when practical so motion presets remain meaningful.

Examples:

- `rigid-vessel`
- `water`
- `cloth-heavy`
- `hair`
- `reed`
- `mist`
- `skin`
- `stone`
- `divine-light`

This gives the scene system enough information to avoid applying the same generic sway or drift to unrelated materials.

## Stage 9 — Manifest

Each shot should eventually have a manifest similar to:

```json
{
  "schemaVersion": 1,
  "shotId": "enki-at-the-helm",
  "source": "../../editorial-v1/shot-03.png",
  "visualBible": "blessings-of-sumer-v1",
  "layers": [
    {
      "id": "sky",
      "path": "background/sky.png",
      "role": "background",
      "material": "atmosphere-distant",
      "depth": 0.05
    },
    {
      "id": "enki-body",
      "path": "character/enki-body.png",
      "role": "character",
      "material": "cloth-heavy",
      "depth": 0.52
    }
  ]
}
```

Later, include:

- SHA-256 checksums;
- width/height;
- alpha presence;
- overscan metadata;
- approved/rejected status;
- source prompt or generation provenance where useful.

## Stage 10 — Pre-Animation QC

A shot may enter Remotion benchmark work only after:

- source frame is approved;
- overscan is sufficient;
- hidden backgrounds are clean;
- alpha edges pass inspection;
- character identity remains stable;
- at least four useful depth planes exist when the shot requires depth;
- foreground element does not interfere with captions;
- masks align cleanly;
- no layer introduces lighting discontinuity.

## Shot 3 Recommended First Pass

Start with the smallest set that can prove quality:

1. overscanned sky/coast background;
2. far-water plane;
3. Stag/vessel plane;
4. Enki body/face hero plane;
5. foreground rigging;
6. mist/reflection treatment;
7. blink state.

Only split Enki's head, robe, hair, or hands further if the benchmark proves that doing so visibly improves the result.

## Shot 4 Recommended First Pass

Nammu should rely more on environment/masks than character cutouts:

1. deep-water background;
2. mid-water current plane;
3. foreground refraction/water plane;
4. suspended-particle atmosphere;
5. Nammu coherence/light mask;
6. optional partial facial/figure suggestion if required.

The supernatural presence should emerge from water structure, not from sliding a transparent character PNG into frame.

## Review At Three Scales

Every prepared layer set should be reviewed:

1. at 100-200% for edges and reconstruction artifacts;
2. at full 1080x1920 composition size for framing/depth;
3. at phone size for identity, readability, and whether small defects matter perceptually.

## A/B Asset Decisions

When unsure whether more separation helps, compare:

- flattened Enki vs separate head;
- one water plane vs two;
- rigging foreground vs no rigging;
- cloth overlay vs static cloth;
- literal Nammu layer vs current/light coherence.

Choose the simpler asset model unless the more complex version clearly scores better.

## Failure Modes

Reject an asset package if:

- it requires large camera motion to feel alive;
- layer seams appear only after movement starts;
- Enki changes appearance between blink/gaze states;
- background repair becomes visible during parallax;
- foreground element feels pasted on;
- lighting differs across layers;
- repeated AI texture becomes obvious;
- the scene becomes harder to maintain than the visual benefit justifies.

## Definition Of Success

The asset pipeline succeeds when the separated scene still looks like one authored painting at rest, but gives Remotion enough clean semantic depth to produce camera movement, parallax, atmosphere, lighting, and restrained performance without revealing how the image was decomposed.
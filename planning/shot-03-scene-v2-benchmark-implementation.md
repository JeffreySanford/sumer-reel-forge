# Shot 3 Scene V2 Benchmark Implementation

## Purpose

Turn Shot 3 — **Enki at the Helm** — into the first executable Scene V2 benchmark and compare it against the working Editorial V1 motionized-still baseline.

The benchmark must improve cinematic credibility without adding motion merely to demonstrate that motion is possible.

> Make the ordinary world believable enough that the mythology feels extraordinary.

## Baseline

Editorial V1 already proves the reel can work with:

- approved painterly artwork;
- real narration;
- procedural ambience;
- captions;
- restrained FFmpeg camera movement;
- a technically valid 1080 × 1920 H.264 output.

The Scene V2 benchmark therefore has to earn its complexity. More animation is not automatically better.

## Benchmark clip

- Source: Reel 1 / Shot 3
- Source timeline: frames 390–599
- Benchmark timeline: frames 0–209
- Duration: 7 seconds
- Resolution: 1080 × 1920
- Frame rate: 30 fps
- Composition: `SceneV2Benchmark`
- Scene: `tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json`

## First-pass motion language

The flattened Editorial V1 painting remains the identity source for this first pass.

Enabled:

- 2.4% `cinematicSlow` camera push;
- tiny framing drift toward Enki while preserving his facial identity;
- low-frequency heavy-physical vessel response;
- independent multi-frequency water reflection;
- restrained dawn mist drift;
- reflected-water light modulation;
- camera deceleration and settling before the Shot 4 handoff.

Deferred until separated `animation-v1` layers exist:

- Enki breathing;
- one blink;
- subtle gaze shift;
- independent robe movement;
- rigging tension and lag;
- vessel-only parallax;
- face-local reflection masks.

The Scene V2 file declares deferred performance explicitly rather than simulating articulation on a flattened painting.

## Deterministic policy

The executable Scene V2 validator must reject:

- schema versions other than 2;
- story mutation;
- disabled human approval;
- missing required visual layers;
- invalid frame bounds;
- non-`cinematicSlow` camera easing;
- Shot 3 camera scale delta above 3%;
- unknown motion presets;
- unsafe absolute or parent-traversing asset paths.

The current benchmark intentionally warns that character performance is deferred.

## Review package

`pnpm render:animation:shot3-benchmark` produces:

- `shot3-scene-v2-benchmark.mp4`;
- five review frames at 0%, 25%, 50%, 75%, and 100%;
- a horizontal contact sheet;
- SHA-256 checksums;
- a benchmark manifest containing validation, review policy, and source policy.

## Human review criteria

The clip does not pass merely because it renders.

The human scorecard should answer:

1. **Composition** — Is Enki still the unambiguous eye target at all five review markers?
2. **Camera restraint** — Does the 2.4% push feel almost invisible rather than like a Ken Burns move?
3. **Physicality** — Does the low-frequency movement suggest vessel mass rather than floating artwork?
4. **Environment** — Do water reflection and mist move independently without looking like an overlay effect?
5. **Lighting** — Does reflected light support Enki rather than wash out his face?
6. **Stillness** — Is facial identity stable enough that the painting retains authority?
7. **Handoff** — Does the end state prepare the viewer for the water/Nammu shot?
8. **Publishability** — Is this clip itself good enough to use in the reel?

No category may score below 4. Publishability must score 5 before this becomes the Shot 3 style benchmark.

## Exit condition

Only after the flattened-art Scene V2 path is technically and visually sound do we create `animation-v1` separated assets for Enki, water, vessel, rigging, robe, foreground framing, atmosphere, and masks.

That second pass should preserve the same Scene V2 contract. Asset sophistication increases; the production architecture does not change.

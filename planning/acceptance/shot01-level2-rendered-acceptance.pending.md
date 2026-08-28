# Shot 1 Level 2 rendered acceptance — PENDING

Status: **candidate only / human normal-speed review required**

Shot: **1 — black-water-before-dawn**

Candidate scene:

`tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json`

Canonical baseline:

`tools/animation/scenes/reel-01-shot-01-black-water-benchmark.scene-v2.json`

## Intent

Upgrade the conservative Shot 1 camera-only benchmark toward Level 2 environmental motion without replacing, segmenting, repainting or mutating the approved editorial source.

The candidate deliberately keeps the exact approved editorial frame as its only image layer and adds bounded deterministic motion in four review domains:

1. restrained cinematic camera push;
2. source-compatible black-water shimmer through the existing `waterPulse` material treatment;
3. low-opacity dawn mist through `mistDrift`;
4. deterministic cinematic grade evolution already owned by the Scene V2 renderer.

The first pass does **not** add characters, particles, new geometry, generative pixels, new layer assets or autonomous AI timing.

## Render

From the repository root:

```sh
pnpm exec tsx tools/scripts/render-scene-v2-benchmark.ts tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json
```

Review the generated MP4 and contact sheet at normal playback speed.

## Human acceptance questions

- Does the shot still read first as primordial stillness rather than an animation demo?
- Is the water motion visible enough to feel alive but restrained enough to preserve the painting?
- Does the mist read as dawn atmosphere rather than a synthetic overlay?
- Does the camera remain subordinate to the environment?
- Is the Level 2 candidate clearly preferable to the current canonical benchmark at normal speed?
- Does any motion interfere with captions or the dawn-horizon eye target?

## Hard failures

Reject the candidate if any of the following occur:

- water shimmer reads as graphic bands or modern VFX;
- mist obscures source detail or looks like smoke/fog pasted over the painting;
- motion is only noticeable when paused or scrubbed;
- camera movement becomes the dominant contribution;
- the approved source identity/composition appears changed;
- the candidate is technically green but not preferred at normal speed.

## Promotion boundary

This document does not approve or promote anything. `animation-v1` remains authoritative until a reviewed candidate is explicitly preferred and promoted through the existing human-controlled production path.

# Shot 1 Level 2 rendered acceptance — PENDING

Status: **candidate only / human normal-speed review required**

Shot: **1 — black-water-before-dawn**

Candidate scene:

`tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json`

Canonical baseline:

`tools/animation/scenes/reel-01-shot-01-black-water-benchmark.scene-v2.json`

## Intent

Upgrade the conservative Shot 1 camera-only benchmark toward Level 2 environmental motion without replacing, segmenting, repainting or mutating the approved editorial source.

The repo's prior Level 2 human gate requires at least three meaningful motion improvements that are visible at normal speed. This candidate therefore counts only improvements that are genuinely new relative to the current camera-only Shot 1 baseline:

1. source-compatible black-water surface shimmer through the existing `waterPulse` material treatment;
2. a separate soft reflected-light pulse from that runtime path, which must read as dawn light rather than a character spotlight or pasted glow;
3. low-opacity dawn mist through `mistDrift`.

The restrained cinematic push and existing deterministic grade remain supporting structure and are **not** counted as new Level 2 improvements.

The first pass does **not** add characters, particles, new geometry, generative pixels, new layer assets or autonomous AI timing.

## Render

From the repository root:

```sh
node tools/scripts/render-shot01-level2-candidate.mjs
```

Equivalent generic command:

```sh
pnpm exec tsx tools/scripts/render-scene-v2-benchmark.ts tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json
```

Review the generated MP4 and contact sheet at normal playback speed against the canonical Shot 1 benchmark.

## Human acceptance questions

- Does the shot still read first as primordial stillness rather than an animation demo?
- Is the water-surface motion visible enough to feel alive but restrained enough to preserve the painting?
- Does the separate reflected-light pulse read naturally as dawn/horizon illumination rather than an unexplained upper-frame glow?
- Does the mist read as dawn atmosphere rather than a synthetic overlay?
- Are all three new environmental improvements readable at normal speed?
- Does the camera remain subordinate to the environment?
- Is the Level 2 candidate clearly preferable to the current canonical benchmark at normal speed?
- Does any motion interfere with captions or the dawn-horizon eye target?

## Hard failures

Reject the candidate if any of the following occur:

- fewer than three meaningful new improvements are readable at normal speed;
- water shimmer reads as graphic bands or modern VFX;
- reflected light resembles a face spotlight, pasted glow, or fantasy effect rather than dawn light;
- mist obscures source detail or looks like smoke/fog pasted over the painting;
- motion is only noticeable when paused or scrubbed;
- camera movement becomes the dominant contribution;
- the approved source identity/composition appears changed;
- the candidate is technically green but not preferred at normal speed.

## Promotion boundary

This document does not approve or promote anything. `animation-v1` remains authoritative until a reviewed candidate is explicitly preferred and promoted through the existing human-controlled production path.

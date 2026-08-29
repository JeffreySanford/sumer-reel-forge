# Shot 1 Level 2 rendered acceptance — PENDING

Status: **candidate only / human normal-speed review required**

Shot: **1 — black-water-before-dawn**

Candidate scene:

`tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json`

Canonical baseline:

`tools/animation/scenes/reel-01-shot-01-black-water-benchmark.scene-v2.json`

## Revised intent

Upgrade the conservative Shot 1 camera-only benchmark toward Level 2 environmental motion without replacing, segmenting, repainting or mutating the approved editorial source.

**Readable water animation is now a mandatory Shot 1 Level 2 requirement.** A generic shimmer alone is not sufficient. The black-water field must contain source-preserving surface displacement that is visible at normal speed while retaining the primordial stillness, horizon stability and composition of the approved painting.

The repo's Level 2 human gate still requires at least three meaningful improvements. For Shot 1 the target set is now:

1. **mandatory dedicated water-surface movement** — source-pixel horizontal current plus restrained vertical ripple in the lower water field;
2. low-opacity dawn mist through `mistDrift`;
3. a soft reflected-light pulse that reads as dawn/horizon illumination rather than a character spotlight or pasted glow.

The existing `waterPulse` shimmer may support the dedicated surface movement, but it no longer counts as a separate Level 2 improvement by itself. The restrained cinematic push and deterministic grade also remain supporting structure and are not counted as new Level 2 improvements.

The candidate must not add characters, generated imagery, replacement pixels, autonomous AI timing, or new canonical layer assets.

## Forge Water Lab — Option B audition

Shot 1 water motion is currently auditioned non-canonically through the React Forge Lab.

Start the local stack and open:

```text
http://localhost:4300/forge/shot/1
```

The Shot 1 Water Lab exposes four normalized controls:

- `horizontalCurrent`
- `verticalRipple`
- `flowSpeed`
- `rippleScale`

Click **Render water audition** to create a temporary Scene V2 and render it through the real Remotion benchmark pipeline. The generated scene and video live only under:

`tmp/forge-water-auditions/<id>/`

The Water Lab does not modify `animation-v1`, the approved source image, the manifest, approvals, or production jobs.

The committed Level 2 candidate intentionally remains free of a `waterSurface` block until a human-reviewed Water Lab envelope is selected. This prevents an exploratory setting from becoming canonical by accident.

## Existing atmospheric A/B review

The current atmospheric candidate can still be reviewed with:

```sh
node tools/scripts/render-shot01-level2-review.mjs
```

The script renders both scenes through the same Scene V2 benchmark path and writes a side-by-side normal-speed proof:

```text
LEFT  = current canonical camera-only benchmark
RIGHT = Level 2 environmental motion candidate
```

It also writes a pending proof receipt under:

`tmp/animation-previews/shot01-level2-proof/<timestamp>/shot01-level2-rendered-proof.json`

That receipt does not approve or promote the candidate.

## Human acceptance questions

- Does the shot still read first as primordial stillness rather than an animation demo?
- **Is actual water-surface displacement clearly visible at normal speed?**
- Does the water feel like a heavy black surface/current rather than sliding image strips or rubbery distortion?
- Does the horizon remain visually stable while the lower water field moves?
- Does the reflected-light pulse read naturally as dawn/horizon illumination rather than an unexplained upper-frame glow?
- Does the mist read as dawn atmosphere rather than a synthetic overlay?
- Are the three required Level 2 contributions — water movement, mist and dawn-light response — readable at normal speed?
- Does the camera remain subordinate to the environment?
- Is the updated candidate clearly preferable to the canonical baseline at normal speed?
- Does any motion interfere with captions or the dawn-horizon eye target?

## Hard failures

Reject the candidate if any of the following occur:

- **dedicated water-surface movement is absent or only detectable while paused/scrubbed;**
- fewer than three meaningful Level 2 improvements are readable at normal speed;
- water movement resembles sliding horizontal slices, gelatin, heat-haze, or modern digital distortion;
- water movement destabilizes the horizon or obviously moves non-water source content;
- water shimmer reads as graphic bands or modern VFX;
- reflected light resembles a face spotlight, pasted glow, or fantasy effect rather than dawn light;
- mist obscures source detail or looks like smoke/fog pasted over the painting;
- camera movement becomes the dominant contribution;
- the approved source identity/composition appears changed;
- the candidate is technically green but is not preferred at normal speed.

## Promotion boundary

This document does not approve or promote anything. `animation-v1` remains authoritative. A Water Lab audition must first be preferred by a human at normal speed; only then may its exact normalized envelope be persisted into a reviewed candidate scene and subjected to the same deterministic QA and baseline-vs-candidate proof before any promotion decision.

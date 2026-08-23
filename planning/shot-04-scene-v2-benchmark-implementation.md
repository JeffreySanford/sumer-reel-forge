# Shot 4 Scene V2 Benchmark Implementation

## Purpose

Implement the second Reel 1 animation benchmark using the generic Scene V2 renderer. Shot 3 establishes physical credibility. Shot 4 tests restrained mythic realism: Nammu should become recognizable through water, current, refraction, and coherence without entering the frame as a conventional animated character.

## Scene

`tools/animation/scenes/reel-01-shot-04-nammu-benchmark.scene-v2.json`

- source shot: 4
- duration: 240 frames / 8 seconds
- camera: `nearStatic`
- scale: `1.000 -> 1.008`
- rotation: none
- eye target: water/current coherence region
- stillness anchor: camera/composition
- performance: enabled `numinousDrift`
- physical water: `waterPulse`
- source asset: `editorial-v1/shot-04.png`

## Hard Rules

Scene V2 validation now rejects Shot 4 when:

- camera scale change exceeds 1%;
- camera preset is not `nearStatic` or `static`;
- camera rotation is used;
- enabled `numinousDrift` is absent;
- conventional character performance (`breathing`, `blinkOnce`, `subtleGazeShift`) is enabled.

These rules encode the creative direction that Nammu is an environmental presence first.

## Generic Rendering Treatment

`SceneV2Benchmark` remains the only benchmark composition. No bespoke Nammu composition is introduced.

When a shot contains enabled `numinousDrift`, the composition adds:

1. full-frame, low-intensity physical water/refraction bands;
2. deterministic suspended depth particles;
3. a masked, refracted echo of the source painting whose coherence increases and later dissolves;
4. independent current/light movement with non-matching periods;
5. a cool underwater grade;
6. a restrained bright-water handoff shape late in the shot.

The treatment intentionally avoids:

- a separate full-body Nammu layer;
- literal opacity fade-in of a woman;
- eye or lip animation;
- mermaid staging;
- horror effects;
- high-density particles;
- warm magical halo language.

## Recognition Timeline

- 0-25%: physical water dominates.
- 25-60%: unusual current/light organization becomes perceptible.
- 60-85%: strongest environmental coherence and recognition.
- 85-100%: coherence returns toward water while a brighter water shape prepares the next transition.

Review markers are generated at:

- `physical-water`
- `unusual-pattern`
- `recognition`
- `coherence-peak`
- `dissolution`

## Commands

Validate Scene V2 policy:

```bash
pnpm scene-v2:test
```

Render Shot 4 benchmark:

```bash
pnpm render:animation:shot4-benchmark
```

The generic benchmark renderer derives output names from `sourceShotNumber`, producing a Shot 4 MP4, five review frames, contact sheet, checksums, and manifest without overwriting Shot 3 outputs.

## Human Review Questions

1. Does the camera feel noticeably quieter than Shot 3?
2. Does the water remain physically credible before and during recognition?
3. Does Nammu appear to emerge from environmental organization rather than enter the scene?
4. Is the recognition readable on a phone without becoming literal?
5. Does the coherence peak remain mysterious when paused?
6. Does the final bright-water shape feel like a useful transition seed rather than an effect?
7. Would this treatment still feel specifically authored for Nammu if the sound were muted?

## Exit Criterion

Shot 4 becomes the second approved visual benchmark only after human review confirms that it demonstrates a numinous visual grammar distinct from Shot 3 while preserving the same illustrated-documentary restraint.

# Sprint 006 - Reel 1 Animation Polish

## Goal

Turn Reel 1 from a technically successful Remotion proof into a visually coherent cinematic illustrated benchmark that can define the animation style for the rest of Chapter 1.

This sprint intentionally prioritizes art direction, layered assets, motion restraint, and data-driven scene composition over new animation features.

## Why This Sprint Exists

Sprint 005 proved that Sumer Reel Forge can:

- render true frame-to-frame animation with Remotion;
- synchronize narration and captions;
- route animation through the worker;
- persist generated assets and manifests;
- review outputs in the studio;
- render a complete 60-second Reel 1 draft.

The remaining problem is quality. The current animation still relies too heavily on procedural SVG and hard-coded scene drawing. That is sufficient for infrastructure validation but not yet the desired publication style.

Sprint 006 uses Reel 1 as the test case for replacing that proof-art approach with layered illustrated assets and a more disciplined cinematic motion grammar.

## Primary Benchmark

Use Shot 3, `Enki at the helm`, as the first quality benchmark.

Why Shot 3:

- it includes Enki continuity;
- it includes the Stag and water;
- it requires character life without theatrical acting;
- it benefits from foreground parallax;
- it tests camera motion, light, atmosphere, cloth, breathing, blink, and gaze;
- it exposes visual problems quickly.

The benchmark should be approximately 8-12 seconds and strong enough to publish as a standalone teaser.

## Secondary Benchmark

After Shot 3 is approved, use one contrasting scene to prove the style is reusable.

Preferred order:

1. Shot 4, Nammu beneath the water, to test supernatural motion and stillness; or
2. Shot 7, Dilmun reveal, to test environment-scale depth and lighting.

Do not animate all eight shots before the benchmark style is approved.

## Scope

### 1. Lock the animation style target

- [x] Add `planning/reel-01-animation-style-bible.md`.
- [ ] Review the style bible against the existing Blessings of Sumer visual bible.
- [ ] Record any conflicts or continuity changes before creating animation-v1 assets.

### 2. Create versioned layered assets for Shot 3

- [ ] Create `assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/`.
- [ ] Preserve `editorial-v1/shot-03.png` as the immutable source reference.
- [ ] Derive or regenerate an overscanned background plate.
- [ ] Create separate coast / distant environment layer where practical.
- [ ] Create separate water layer or reflection treatment.
- [ ] Create boat layer.
- [ ] Create Enki body layer.
- [ ] Create Enki head layer if independent motion improves quality.
- [ ] Create open-eye and blink states.
- [ ] Create cloth or robe overlay if needed for secondary movement.
- [ ] Create foreground rigging or vessel occluder.
- [ ] Create mist / atmosphere layer.
- [ ] Create lighting or reflection mask where useful.
- [ ] Record source provenance and checksums in an animation-v1 asset README or manifest.

### 3. Build reusable motion primitives

The benchmark should not become another one-off composition.

Candidate primitives:

- [ ] `CinematicCamera`
- [ ] `ParallaxLayer`
- [ ] `AtmosphereLayer`
- [ ] `LightSweep`
- [ ] `WaterShimmer`
- [ ] `BoatBob`
- [ ] `BreathingTransform`
- [ ] `BlinkState`
- [ ] `SubtleHeadTurn`
- [ ] `ForegroundOccluder`
- [ ] `CinematicCaption`

Naming may change during implementation. The important constraint is that the benchmark scene should be assembled from reusable pieces rather than copied shot-specific transform code.

### 4. Make the benchmark scene data-driven

- [ ] Define a concrete scene schema for camera movement, layers, depth, motion presets, masks, and timing.
- [ ] Pass scene data into Remotion through input props or an equivalent single authoritative scene-data path.
- [ ] Remove duplicate hard-coded timing or dimensions where scene data can own them safely.
- [ ] Keep source narration and reel editorial data authoritative for story content.
- [ ] Ensure a future Reel 2 does not require a new `FullReel2Animation.tsx` simply to describe different artwork and shot timing.

### 5. Produce a fast benchmark review loop

- [ ] Add a short command for rendering only the Shot 3 benchmark.
- [ ] Extract representative still frames.
- [ ] Generate a contact sheet.
- [ ] Generate a Markdown review report using the style-bible rubric.
- [ ] Persist the benchmark review artifacts through the studio when useful.
- [ ] Keep benchmark iteration significantly faster than rendering the full 60-second reel.

### 6. Polish motion intentionally

For Shot 3, tune:

- [ ] slow camera push;
- [ ] parallax depth between coast, water, boat, Enki, and foreground rigging;
- [ ] boat movement independent from camera movement;
- [ ] restrained Enki breathing;
- [ ] one natural blink;
- [ ] one subtle gaze or head shift;
- [ ] robe or hair movement with lag;
- [ ] water reflection movement;
- [ ] mist or air movement;
- [ ] soft reflected light or edge light;
- [ ] easing and settling so motion has mass.

Reject motion channels that do not improve the scene.

### 7. Approve a second contrasting benchmark

Once Shot 3 passes:

- [ ] Build either Shot 4 or Shot 7 from the same primitives and scene schema.
- [ ] Confirm the style works for a non-standard character shot.
- [ ] Document any new primitive that was actually necessary.
- [ ] Avoid expanding into all eight shots until both benchmark scenes pass review.

### 8. Propagate the approved language to Reel 1

Only after both benchmark scenes pass:

- [ ] Layer Shot 1.
- [ ] Layer Shot 2.
- [ ] Layer Shot 5.
- [ ] Layer Shot 6.
- [ ] Layer the remaining Shot 4 or Shot 7 benchmark counterpart.
- [ ] Layer Shot 8.
- [ ] Replace procedural proof visuals with approved layered artwork scene by scene.
- [ ] Render a complete 60-second Reel 1 animation-v1 candidate.
- [ ] Review full-reel pacing and transitions separately from benchmark-shot quality.

## Motion Budget Rule

For a typical 6-9 second shot, begin with no more than:

- one primary camera or subject movement;
- one restrained subject motion;
- two environmental motion channels;
- one lighting or atmosphere channel.

More motion requires a clear narrative or compositional reason.

## Art Direction Guardrails

- Do not optimize for maximum visible movement.
- Do not allow procedural SVG characters to become the publication-art path.
- Do not make every character speak or lip-sync under narration.
- Do not use generic fantasy glow to communicate divinity.
- Do not introduce Egyptian, Greco-Roman, medieval, or fantasy visual shorthand.
- Do not overwrite approved editorial-v1 assets.
- Do not treat AI video as necessary for every shot.
- Do not move to Reel 2 because Reel 1 is merely technically complete.

## Deferred Work

The following work is explicitly deferred until Reel 1 animation style approval:

- Rhubarb Lip Sync integration;
- large reusable skeletal rig system;
- full facial performance system;
- Reel 2 animation production;
- Chapter 2 animation production;
- WebGL/PixiJS expansion unless the benchmark demonstrates a concrete need;
- generalized animation features without a Reel 1 quality requirement.

## Benchmark Review Rubric

Each benchmark render is scored 1-5 for:

- art continuity;
- depth;
- motion restraint;
- camera language;
- atmosphere and light;
- character life;
- publishability.

Required benchmark result:

- no category below 4;
- publishability must reach 5 before the style is propagated across Reel 1.

## Acceptance Criteria

Sprint 006 is successful when:

- [ ] Shot 3 uses layered illustrated assets derived from or consistent with approved editorial artwork.
- [ ] Shot 3 no longer depends on procedural SVG character drawing as its principal visual source.
- [ ] At least four depth planes are perceptible and natural.
- [ ] Camera, boat, character, foreground, and environmental motion are independently timed.
- [ ] Character movement is restrained and avoids puppet-like behavior.
- [ ] A mid-shot still frame is acceptable as editorial artwork.
- [ ] The benchmark scores at least 4 in every rubric category and 5 for publishability.
- [ ] A second contrasting scene proves the same motion system can handle a different visual problem.
- [ ] The scene schema drives benchmark composition through data rather than duplicating scene behavior in bespoke React.
- [ ] Review artifacts document why the benchmark passed or failed.
- [ ] No source/story text is changed as part of animation polish.
- [ ] Final publication remains a human approval gate.

## Stretch Goals

Only attempt these if the benchmark style is already approved:

- [ ] Prototype an atmospheric transition from Shot 3 into Shot 4.
- [ ] Add layer validation for missing or incorrectly sized assets.
- [ ] Add automatic overscan validation for camera-safe movement.
- [ ] Add an animation asset manifest that records source editorial frame, layer checksum, semantic role, depth, and motion preset.
- [ ] Add a visual diff or contact-sheet comparison between procedural proof and layered benchmark.

## Definition Of Done

This sprint is not done because a command renders successfully.

It is done when Reel 1 has an approved, repeatable animation language that the project would willingly carry into the rest of Chapter 1.
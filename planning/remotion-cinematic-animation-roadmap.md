# Remotion Cinematic Animation Roadmap

## Objective

Build a cinematic illustrated animation path that can produce publication-quality vertical reels while preserving the existing reviewed still-frame editorial pipeline, studio review flow, deterministic rendering, asset manifests, and human approval gates.

## Recommendation

Continue using Remotion as the animation composition and render engine.

The renderer itself is no longer the primary risk. Sprint 005 proved that Remotion can render synchronized vertical animation through the current studio pipeline. The current quality bottleneck is the visual source and motion language: the full Reel 1 draft still relies too heavily on procedural SVG/vector scene construction and hard-coded shot behavior.

The next phase therefore prioritizes layered illustrated artwork, restrained motion design, data-driven scene composition, and explicit art-direction review rather than adding more animation engines or facial-animation features.

## Current Status

The standalone Remotion proof is implemented under `tools/animation` and runs with `pnpm render:animation:proof`. It renders a 30-second 1080x1920 MP4, synthesizes timed narration clips, muxes AAC audio, validates duration with FFprobe when available, and writes a checksum-bearing manifest.

Style and motion loops are implemented with:

- `pnpm render:animation:style-test`;
- `pnpm render:animation:style-review`;
- `pnpm render:animation:motion-proof`;
- `pnpm render:animation:motion-review`.

The full Reel 1 animation draft is implemented with `FullReelAnimation` and `tools/animation/scenes/reel-01-full-animation.scene.json`. `pnpm render:animation:full-reel1` renders it directly, while `pnpm render:animation:reel1` queues a `draft-video` job through `RENDER_ADAPTER=animation`, persists generated assets through the API, and validates the persisted 60-second MP4.

This proves the technical pipeline. It does not yet prove publication-quality art direction.

## Quality Reframe

Sprint 005 answered:

> Can the studio render, synchronize, persist, and review a complete animated Reel 1?

Yes.

Sprint 006 must answer:

> Can Reel 1 establish a cinematic illustrated animation language strong enough to publish and repeat?

Use `planning/reel-01-animation-style-bible.md` as the quality contract and `planning/sprint-006-reel-one-animation-polish.md` as the implementation sequence.

## Milestones

### Milestone 1 - Feasibility Spike - complete

- [x] Add Remotion dependencies behind a focused project or tool target.
- [x] Render a composition to MP4 locally.
- [x] Validate output dimensions, codec, duration, and audio muxing.
- [x] Document local setup and CI implications.

### Milestone 2 - Technical Layered Animation Proof - complete

- [x] Define an initial scene schema for layers, transforms, camera, and timing.
- [x] Build reusable Remotion vertical-video compositions for technical evaluation.
- [x] Demonstrate parallax, camera moves, blink states, atmosphere, water glints, cloth sway, and pose/gesture changes.
- [x] Render short style and motion proofs.
- [x] Expand to a complete 60-second Reel 1 animation draft with narration, captions, and shot data.

This milestone proves animation capability but still contains significant procedural SVG/vector art and hard-coded composition behavior.

### Milestone 3 - Reel 1 Publication-Quality Benchmark - active

- [x] Define the Reel 1 animation style bible.
- [ ] Use Shot 3, Enki at the helm, as the primary 8-12 second benchmark.
- [ ] Derive versioned layered animation assets from or consistent with approved Reel 1 editorial artwork.
- [ ] Replace procedural SVG characters and scenery as the principal benchmark visual source.
- [ ] Establish at least four convincing depth planes.
- [ ] Use restrained breathing, blink, gaze/head movement, cloth response, boat motion, water movement, atmosphere, and light.
- [ ] Use a motion budget rather than animating every available channel.
- [ ] Add a fast benchmark review loop with sampled stills, contact sheet, and style-bible scoring.
- [ ] Require no review category below 4 and publishability 5 before propagating the style.

### Milestone 4 - Data-Driven Scene Composition - active with Reel 1

The current scene JSON describes useful editorial timing and intent, but `FullReelAnimation` still reads significant hard-coded source data and scene behavior directly in React.

Target architecture:

```text
Reel production data
        |
        v
Scene builder
        |
        v
Versioned scene JSON
        |
        v
Generic Remotion composition + input props
        |
        v
Rendered animation
```

Tasks:

- [ ] Define concrete scene fields for camera transform, easing, layer depth, motion preset, masks, timing, and asset references.
- [ ] Pass scene data into Remotion through input props or an equivalent single authoritative scene-data mechanism.
- [ ] Eliminate duplicate hard-coded dimensions/timing where the scene can safely own them.
- [ ] Keep narration/story content sourced from the reel production record.
- [ ] Add asset validation and overscan checks.
- [ ] Persist derived-layer provenance and checksums.
- [ ] Ensure Reel 2 can eventually use the same generic composition instead of requiring `FullReel2Animation.tsx`.

### Milestone 5 - Second Style Proof

After Shot 3 passes, prove the same style on a contrasting scene before animating the whole reel.

Preferred candidates:

- Shot 4, Nammu beneath the water, for supernatural motion, refraction, and stillness; or
- Shot 7, Dilmun reveal, for environment scale, haze, depth, birds, and lighting.

Acceptance:

- [ ] Reuse the same motion primitives and scene schema.
- [ ] Add only primitives justified by the new visual problem.
- [ ] Preserve the same visual and motion grammar.
- [ ] Pass the same review rubric.

### Milestone 6 - Complete Reel 1 Animation V1

Only after the two benchmark scenes are approved:

- [ ] Create layered animation-v1 assets for all remaining Reel 1 shots.
- [ ] Replace procedural proof visuals shot by shot.
- [ ] Use motivated transitions rather than relying primarily on generic dissolves.
- [ ] Preserve the cool-black-water to warm-Dilmun progression.
- [ ] Render the complete 60-second animation-v1 candidate.
- [ ] Review full-reel pacing, transitions, caption placement, narration, score, and motion continuity.
- [ ] Keep publication as a human decision.

### Milestone 7 - Reusable Character Kit

Build only the level of character reuse demonstrated to be useful by Reel 1.

- [ ] Define pose, eye, head, cloth, and expression naming conventions.
- [ ] Add layer validation.
- [ ] Add one reusable Enki kit based on the approved visual style.
- [ ] Keep the first kit deliberately small.

Do not build a large skeletal rig system unless the Reel 1 benchmark demonstrates a concrete need.

### Milestone 8 - Lip Sync - deferred

Rhubarb Lip Sync is no longer the immediate next milestone.

Use lip sync only for visible on-camera speech where mouth cues materially improve the shot.

For narrated Reel 1 passages, prefer:

- breathing;
- blink;
- gaze;
- head movement;
- posture;
- cloth;
- atmosphere;
- camera language.

Future tasks when needed:

- [ ] Add Rhubarb as an optional local tool.
- [ ] Generate mouth cues from direct-speech narration assets.
- [ ] Map cue output to a small approved mouth-shape set.
- [ ] Persist lip-sync metadata in the render manifest.

### Milestone 9 - Scale To Reel 2

Do not begin Reel 2 animation production until Reel 1 animation quality is approved.

The architecture is ready to scale when a new reel can be produced mostly by supplying:

- approved artwork;
- layered assets;
- scene data;
- narration/caption timing;
- motion presets;
- review decisions;

rather than writing a new custom animation composition.

## Asset Strategy

Prefer layered raster artwork for characters and painterly scene elements, with SVG/CSS used where they are strongest: masks, typography, procedural particles, simple effects, and controlled overlays.

Recommended asset types:

- background plates;
- distant environment planes;
- water/terrain planes;
- major prop or vessel layers;
- character body/head layers;
- minimal eye/blink states;
- optional cloth/hair overlays;
- foreground occluders;
- atmosphere layers;
- reflection/light masks.

All animation-specific derived assets should be versioned separately from approved `editorial-v1` source frames.

## Motion Strategy

Default 6-9 second shot budget:

- one primary movement;
- one restrained subject motion;
- two environmental channels;
- one lighting/atmosphere channel.

Preferred camera language:

- slow dolly;
- restrained lateral track;
- slow reveal;
- foreground occlusion;
- subtle boat-mounted drift;
- gentle scale change.

Avoid constant movement, synchronized sine-wave motion across all elements, or theatrical character acting under third-person narration.

## Non-Goals During Reel 1 Polish

- No Reel 2 animation production.
- No Chapter 2 animation expansion.
- No full custom animation engine.
- No large skeletal rigging system.
- No mandatory lip sync.
- No broad WebGL/PixiJS migration without a measured need.
- No replacement of approved editorial source art merely to exercise animation code.
- No story/source text edits as part of animation infrastructure work.

## Open Questions To Resolve Through Reel 1

- Which editorial frames can be successfully separated into layers and which need regenerated overscanned variants?
- How many depth planes are enough before additional layers stop improving perceived quality?
- Which character motions are actually necessary for Enki to feel alive without looking puppeted?
- Should camera/motion presets be named semantic presets or expressed entirely as numeric scene data?
- Which transition motifs can be reused without becoming repetitive?
- Does the current caption treatment remain readable over richer moving imagery?
- Is transparent PNG sufficient for the approved character style, or do a small number of vector masks improve edge control?

These should be answered experimentally through Reel 1 rather than prematurely generalized.
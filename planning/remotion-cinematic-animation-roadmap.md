# Remotion Cinematic Animation Roadmap

## Objective

Build a publication-quality cinematic illustrated animation path while preserving reviewed source art, deterministic rendering, asset manifests, auditability, and explicit human approval.

## Recommendation

Continue using Remotion as the animation composition/render engine.

The renderer is no longer the primary risk. Reel 1 now proves the complete canonical production path: approved `animation-v1` assets, Scene V2 resolution, an eight-shot `CanonicalReel1` composition, exact 60-second rendering, shot-aligned Chatterbox narration, continuous ambience, and persisted provenance.

The active quality problem is **how the artwork moves**.

The completed Level 1 reel still reads primarily as still paintings with restrained camera and material motion. The roadmap therefore moves from proving layered rendering to **Level 2 - Living Shots**: articulated, source-preserving 2.5D motion with independent physical relationships.

## Current State

### Level 1 - complete

Level 1 now proves:

- immutable reviewed editorial sources;
- promoted canonical `animation-v1` assets;
- Scene V2 data-driven shot composition;
- structural, material, containment, and provenance QA;
- evidence-aware AI critique with deterministic reconciliation;
- explicit human promotion;
- canonical full-reel animation routing;
- 1080x1920, 30 fps, 1800-frame / 60-second output;
- preserved per-shot approved timing;
- shot-aligned narration across the full reel;
- continuous ambience and final title hold;
- audio-only re-finalization without rerendering the 1800-frame visual.

Level 1 is the reproducible control/reference baseline.

### Level 2 - active

Level 2 must make the world visibly alive without losing source fidelity.

Its core additions are:

- explicit articulation pivots;
- parent/child transform relationships;
- character micro-performance;
- rigid-object motion independent from camera motion;
- secondary lag/inertia;
- material/contact response;
- multi-plane depth and occlusion;
- motion evidence that identifies which subject/material channel actually moved.

See `sprint-008-level-2-living-shots.md`.

## Quality Reframe

Earlier milestones answered:

> Can the studio render, synchronize, persist, review, and safely promote cinematic animation assets?

Yes.

Level 1 then answered:

> Can those approved assets be assembled into a canonical 60-second Reel 1 without bypassing provenance or human review?

Yes.

Level 2 must answer:

> Can Reel 1 look unmistakably animated at normal speed while still preserving the approved illustrated world?

That is now the publication-quality gate.

## Milestones

### Milestone 1 - Feasibility Spike - complete

- [x] Add Remotion tooling.
- [x] Render local MP4 output.
- [x] Validate dimensions, codec, duration, and audio muxing.
- [x] Document local setup.

### Milestone 2 - Procedural Motion Proof - complete

- [x] Build short technical/style/motion compositions.
- [x] Demonstrate camera, parallax, atmosphere, water, blink, breathing, cloth, and gesture concepts.
- [x] Route an animation adapter through the worker.
- [x] Render a full procedural Reel 1 draft.

This proved capability, not production art.

### Milestone 3 - Source-Preserving Layered Production - complete

- [x] Define the animation asset-manifest contract.
- [x] Produce and promote approved layered/source-backed Reel 1 assets.
- [x] Use preservation-first extraction and background-repair lanes.
- [x] Add structural and material QA.
- [x] Add explicit human promotion.
- [x] Prove Shot 3 and Shot 4 layered Scene V2 benchmark grammars.
- [x] Extend the production process through Shots 5-8.

### Milestone 4 - Canonical Reel 1 Level 1 - complete

- [x] Route production Reel 1 through the animation pipeline rather than editorial fallback.
- [x] Add dedicated `CanonicalReel1` composition.
- [x] Assemble all eight approved Scene V2 shots.
- [x] Preserve 1770 approved animation frames plus the explicit 30-frame Shot 5 -> 6 handoff.
- [x] Render exact 1800-frame / 60-second canonical visual output.
- [x] Split narration into eight shot-aligned Chatterbox cues.
- [x] Restore continuous ambience.
- [x] Leave the final title hold free of narration.
- [x] Keep audio finalization reusable without rerendering visuals.

**Human finding:** technically successful, visually too close to still imagery with minor animation.

See `sprint-006-retrospective.md` and `../documentation/projects/blessings-of-sumer/chapters/chapter-01-reel-01-animation-v1-review.md`.

### Milestone 5 - Level 2 Shot 3 Living Benchmark - active

Use Shot 3, Enki at the helm, as the primary seven-second Level 2 benchmark.

Required learning targets:

- [ ] Audit current camera versus actual subject/material motion.
- [ ] Identify only the extra sublayers/pivots needed for credible articulation.
- [ ] Add minimal backwards-compatible transform hierarchy/pivot support.
- [ ] Add secondary lag/inertia relationships.
- [ ] Animate vessel motion independently from the camera.
- [ ] Add source-faithful Enki character life: breathing plus restrained posture/head/gaze/blink behavior as supported by reviewed layers.
- [ ] Add rigging/cloth secondary response when source separation permits it.
- [ ] Add multi-scale water and vessel-contact motion.
- [ ] Add deterministic camera-compensated motion evidence.
- [ ] Render a direct Level 1 / Level 2 A/B review bundle.
- [ ] Require the Level 2 candidate to be visibly preferred without sacrificing identity, composition, or material realism.

Minimum benchmark motion read:

- at least four independently timed non-camera channels;
- at least one genuine character-articulation channel;
- independent rigid-vessel motion;
- at least one secondary-motion relationship with lag or inertia.

These are Shot 3 benchmark requirements, not global quotas for every shot.

### Milestone 6 - Level 2 Contrasting Proofs

After Shot 3 passes:

#### Shot 4 - Nammu

- [ ] Reuse the same architecture for depth-separated currents, refraction, caustics, particulate motion, and environmental coherence.
- [ ] Keep Nammu numinous rather than converting her into a conventional animated cutout.
- [ ] Preserve near-static camera language.

#### Shot 8 - Landfall

- [ ] Prove distant rigid-vessel movement independent from camera.
- [ ] Add water/contact response and physical settling.
- [ ] Preserve the sparse distant boat rather than enlarging or inventing it.
- [ ] Settle motion before the title landing.

### Milestone 7 - Complete Reel 1 Level 2

After Shot 3/4/8 pass:

- [ ] Upgrade Shot 5 hospitality/contained water.
- [ ] Upgrade Shot 7 environmental reveal.
- [ ] Upgrade Shot 2 coastline/vessel environment.
- [ ] Upgrade Shot 6 while preserving its restrained practical-values grammar.
- [ ] Upgrade Shot 1 only as much as the atmospheric opening needs.
- [ ] Render the complete canonical Level 2 Reel 1.
- [ ] Reuse the approved narration/ambience finalization path.
- [ ] Review motion continuity, pacing, transitions, audio/image relationship, and title landing.
- [ ] Require that the full reel no longer reads primarily as a slideshow/Ken Burns treatment.
- [ ] Keep final publication as an explicit human decision.

### Milestone 8 - Reusable Articulation Kit

Build only the reuse demonstrated useful by Level 2.

Potential conventions:

- transform-group naming;
- pivot/anchor metadata;
- head/eye/state overlays;
- arm/prop articulation regions;
- cloth/rigging secondary-lag metadata;
- contact masks;
- character/prop relationship constraints.

Do not build a large general skeletal-rig authoring system unless the approved benchmarks demonstrate a concrete need.

### Milestone 9 - Selective Level 3 Generative Motion - deferred

After Level 2 passes, selectively test image-to-video or other generative motion for problems that remain expensive in deterministic 2.5D, such as complex organic cloth, waves, crowds, or environmental motion.

Any Level 3 candidate must preserve the same gates:

- source lineage;
- candidate isolation;
- deterministic evidence where measurable;
- identity/object continuity review;
- human approval;
- explicit promotion.

Identity drift, object mutation, malformed anatomy, temporal flicker, and invented historical detail are blockers.

### Milestone 10 - Scale To Reel 2

Do not begin Reel 2 animation production until Reel 1 Level 2 is approved.

The architecture is ready to scale when a new reel can be produced mostly by supplying:

- approved artwork;
- layered/articulated assets;
- scene data;
- narration/caption timing;
- motion relationships/presets;
- review decisions;

rather than writing a new bespoke composition.

## Asset Strategy

Prefer source-derived layered raster artwork for characters and painterly scene elements. Use SVG/CSS/procedural code for masks, typography, particles, deterministic lighting effects, and controlled overlays where appropriate.

Level 2 may add:

- character head/state overlays;
- small articulation regions;
- rigging/cloth overlays;
- contact/wake/reflection masks;
- near/far material regions;
- foreground occluders;
- light/reflection masks.

Do not generate missing anatomy or costume details merely to make an articulation control possible.

## Motion Strategy

The old motion-budget principle remains useful, but Level 2 adds a relationship requirement.

Prefer:

- one clear dominant visual action;
- restrained character/subject motion;
- independent rigid-body motion when a prop/vessel exists;
- one or two material/environment channels;
- one secondary lag/inertia relationship;
- restrained light/atmosphere;
- camera motion that is clearly separable from subject motion.

Avoid:

- every layer moving because it can;
- synchronized periodic motion across unrelated materials;
- constant perpetual zooming;
- puppet-like character acting;
- increasing amplitudes globally instead of adding meaningful articulation/contact relationships.

## QA Strategy

Level 2 adds one major rule to existing deterministic QA:

> Pixel change is not enough; the system must know which motion channel contributed it.

Add evidence for:

- camera-compensated subject motion;
- per-channel contribution over multiple beats;
- pivot and rotation bounds;
- deformation containment;
- parent/child consistency;
- secondary-lag relationship;
- contact continuity;
- alpha-edge safety;
- one-frame pop prevention;
- terminal settle behavior.

Calibrate numeric thresholds only from reviewed good and bad candidates. Do not inherit one material's threshold as a global animation-quality gate.

## Non-Goals During Level 2

- No Reel 2 animation production.
- No Chapter 2 animation expansion.
- No full custom animation engine.
- No generalized skeletal-rig authoring UI.
- No mandatory lip sync.
- No broad WebGL/PixiJS migration without measured need.
- No uncontrolled image-to-video production.
- No replacement of approved source art merely to exercise animation code.
- No source-story edits as part of animation infrastructure work.

## Level 2 Exit Question

The milestone is complete when a reviewer can watch the full Reel 1 at normal speed and answer **yes** to both questions:

1. Does this still look unmistakably like the approved Blessings of Sumer artwork?
2. Does this now feel like a living animated film rather than still paintings with minor motion?

Until both are true, Reel 1 remains the benchmark and Reel 2 remains gated.

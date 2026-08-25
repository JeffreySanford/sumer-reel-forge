# Cinematic Animation Pipeline

## Goal

Produce cinematic illustrated reels that visibly animate approved artwork while preserving the Studio's review, approval, audit, render-job, and provenance guarantees.

The pipeline must solve two problems at once:

1. keep character identity, composition, source lineage, and historical art direction stable;
2. create enough independent physical and character motion that the result reads as animation rather than a still-image treatment.

## Engine Decision

Continue using Remotion as the frame-accurate composition/render engine.

Remotion has proven sufficient for deterministic 1080x1920 / 30 fps rendering, layered raster composition, camera transforms, material effects, audio synchronization, titles, and programmatic batch output. The Level 1 Reel 1 result confirms that the renderer itself is not the current bottleneck.

The next quality bottleneck is **motion representation and asset articulation**.

Remotion remains a good fit for:

- cinematic illustrated 2.5D motion;
- layered parallax and depth occlusion;
- explicit transform hierarchies;
- pose/state overlays;
- pivot-aware object and character motion;
- material-specific procedural effects;
- captions, titles, and deterministic final assembly;
- programmatic rendering from Scene V2 data.

Remotion is not expected to provide by itself:

- complex hand-drawn acting;
- a full authoring-grade skeletal rig editor;
- painterly frame-by-frame animation;
- reliable autonomous character performance from a flattened image.

## Current Status - Level 1 Validated

Reel 1 now has a complete canonical Scene V2 production path.

The production path:

- resolves approved `animation-v1` assets;
- requires human-approved canonical layers and checksum provenance;
- assembles eight approved shots through `CanonicalReel1`;
- preserves each shot's approved local timing;
- inserts an explicit 30-frame Shot 5 -> Shot 6 handoff rather than stretching a reviewed shot;
- renders 1800 frames / 60 seconds at 1080x1920, 30 fps;
- finalizes with eight shot-aligned Chatterbox narration cues;
- mixes a continuous ambience bed;
- keeps the final three seconds available for the title/ambience landing;
- keeps audio finalization separate so narration/mix revisions can reuse the rendered visual.

Run the canonical path with:

```sh
pnpm render:animation:reel1
```

The important production composition is:

```txt
CanonicalReel1
```

The older `FullReelAnimation` composition remains a procedural/proof artifact and is not the canonical production Reel 1 visual path.

## Level 1 Creative Finding

The canonical Reel 1 test proved the pipeline but exposed a creative limitation.

Most current Scene V2 motion is intentionally small:

- slow camera pushes;
- layer-level translation/rotation/scale;
- subtle water/refraction changes;
- mist/smoke/atmosphere drift;
- restrained rigid-prop bob;
- limited breathing or state behavior where an asset exists.

This protected source fidelity, but the complete reel still reads primarily as approved still paintings with minor animation.

Therefore the current production baseline is called **Level 1**. It is accepted and reproducible, but it is not yet the publication motion language to scale to Reel 2.

## Level 2 - Living Shots

Level 2 adds **source-preserving articulated 2.5D motion**.

The goal is not to increase every animation amplitude. The goal is to create independently timed relationships among the camera, character, vessel/props, materials, foreground, atmosphere, and light.

Level 2 should support, where justified by a benchmark:

- parent/child transform groups;
- explicit pivots or named articulation anchors;
- separate translation, rotation, and scale channels;
- bounded character micro-articulation;
- breathing, posture/weight shift, gaze, and blink states;
- arm/hand/prop relationships when clean source-derived layers exist;
- rigid-body vessel pitch/roll/heave independent from camera motion;
- secondary lag/inertia for rigging, cloth, hair, reeds, or similar materials;
- multi-plane water/material motion;
- contact response such as vessel -> water and vessel -> rigging;
- foreground depth occlusion;
- asymmetrical motion starts and settles;
- optional bounded deformation masks where rigid transforms cannot produce natural motion.

Level 2 should remain narrow and benchmark-driven. Do not build a general skeletal animation engine before a reviewed shot proves that a simpler articulation model is insufficient.

## Level 2 Scene Architecture

The current Scene V2 contract already provides:

- camera transforms;
- depth-ordered layers;
- semantic roles/materials;
- named anchors;
- transform baselines;
- motion presets;
- performance intervals;
- atmosphere and lighting channels;
- review markers;
- human-approval/source-policy fields.

Level 2 should extend this contract minimally.

Preferred additions, only as needed:

```text
Scene V2 shot
  ├─ camera
  ├─ transform groups
  │    ├─ vessel root
  │    │    ├─ rigging child + lag
  │    │    └─ character root
  │    │         ├─ torso/breath
  │    │         ├─ head/gaze state
  │    │         └─ arm/tiller articulation
  ├─ water/contact layers
  ├─ foreground occluders
  ├─ atmosphere/light
  └─ deterministic motion evidence
```

If parent/child transforms, pivots, lag, and bounded deformation can be added without breaking existing scenes, keep the major schema at V2 and treat the extension as backwards-compatible V2.x semantics. Introduce a new major scene schema only if the existing model becomes ambiguous or unsafe.

## Primary Level 2 Benchmark - Shot 3

Shot 3, Enki at the helm, is the primary benchmark because it exercises the most useful combination of problems:

- character identity;
- rigid vessel;
- water;
- rigging;
- cloth;
- foreground depth;
- atmosphere/light;
- restrained camera movement.

The approved Level 2 Shot 3 should contain at least four independently timed non-camera motion channels, at least one genuine character-articulation channel, independent vessel motion, and at least one secondary-motion relationship with lag or inertia.

Target motion relationships:

- camera: slow intentional push/track and settle;
- vessel: pitch/roll/heave independent from camera;
- Enki: breathing plus one subtle posture or weight adjustment;
- head/gaze/eyes: at most one meaningful shift/blink when source-supported;
- arm/tiller: optional micro-action only if clean source-derived anatomy exists;
- rigging: follows vessel with tension/lag rather than an unrelated loop;
- cloth/hair: secondary response where source separation supports it;
- water: near/far rates plus believable contact response;
- foreground/atmosphere: independent depth motion;
- reflected light: restrained material-linked response.

The benchmark must be reviewed against the approved Level 1 Shot 3 as an A/B comparison.

The active Shot 3 Level 2 gate is intentionally split:

1. declarative motion-channel evidence verifies that approved layers and performance channels can express Level 2 motion;
2. rendered proof verifies vessel, rigging, and readable blink contribution in same-frame controls;
3. human A/B acceptance records that the rendered Level 2 treatment is visually preferable to Level 1 without a compensating loss of source fidelity or material realism.

The current rendered proof bundle is:

```text
tmp/animation-previews/shot03-level2-proof/2026-08-25T14-48-31-261Z
```

Human review rejected this bundle because the right-hand Level 2 render does not visibly blink. The proof now treats blink readability as separate from numeric persistence: a revised closed-eye state must produce a source-faithful, visible blink before `planning/acceptance/shot03-level2-rendered-acceptance.json` can be created.

## Secondary Level 2 Benchmarks

### Shot 4 - Nammu beneath the water

Shot 4 proves that richer motion does not require puppet animation.

Prefer:

- layered current movement;
- refraction/caustics;
- suspended particles;
- foreground water occlusion;
- environmental coherence and dissolution;
- source-supported cloth/hair/current response only when natural;
- near-static or gently descending camera.

Nammu remains a numinous environmental presence, not a conventional animated cutout.

### Shot 8 - landfall

Shot 8 proves rigid-object/environment contact:

- distant boat movement;
- water-contact response;
- pitch/heave/settle distinct from the camera;
- optional reeds/foreground response;
- quiet physical settling before the title.

Do not enlarge, repaint, or invent the distant boat merely to make animation easier.

## Asset Strategy

Preserve the current asset policy.

Existing approved `animation-v1` remains the Level 1 canonical baseline. Level 2 may derive additional candidate layers from the approved source or approved Level 1 layers, but those candidates remain outside canonical production until review and promotion.

Potential Shot 3 Level 2 derived assets include:

- head/face state;
- blink state;
- forearm/hand/tiller articulation region;
- cloth overlay;
- foreground rigging;
- vessel-contact water/wake/reflection mask;
- near/far water regions;
- light/reflection mask.

Do not create visual information simply because an animation controller would benefit from another layer.

## Level 2 QA Model

Level 1 demonstrated that aggregate changed-pixel ratios can be misleading: a camera move may change many pixels while the subject remains static.

Level 2 deterministic evidence should therefore measure motion by channel and relationship.

Useful checks include:

- camera-compensated subject motion;
- per-channel contribution over multiple review beats;
- pivot/rotation/translation bounds;
- deformation-mask containment;
- alpha-edge spill;
- parent/child transform consistency;
- secondary-lag phase relative to its driver;
- vessel/water or vessel/rigging contact continuity;
- absence of one-frame pops/state flashes;
- no clipping outside registered canvas bounds;
- terminal settling without freezing materials that should remain alive.

Do not make one benchmark's numeric thresholds global. Calibrate material/articulation gates only after reviewed good and bad candidates exist.

## Human Quality Gate

A technically valid Level 2 benchmark can still fail.

At normal playback speed, a reviewer should immediately perceive a living animated scene rather than a still painting with a camera move.

The review must also confirm:

- identity remains stable;
- motion is restrained rather than puppeted;
- physical materials retain believable mass;
- independent channels do not share an obvious synchronized loop;
- secondary motion visibly follows its driver with plausible lag;
- a paused frame still looks like approved artwork;
- the emotional intent of the shot remains intact.

The existing `planning/reel-01-animation-review-scorecard.md` remains the publication-quality review contract. Its slideshow/puppet hard-fail language is especially important for Level 2.

## Audio Architecture

The canonical visual and audio finalization are deliberately separable.

The current finalizer:

- generates eight Chatterbox cues;
- places them across the full 60-second reel;
- allows moderate cue pacing without clipping speech;
- mixes a continuous ambience bed;
- leaves a final title hold free of narration;
- muxes audio onto the already-rendered canonical visual.

This architecture should remain unchanged during Level 2 benchmark development. Shot-motion iteration should not force narration regeneration, and narration/mix iteration should not force 1800-frame visual rerenders.

## Level 3 Boundary

Selective generative image-to-video is a possible future tool, not the current production strategy.

Evaluate it only after Level 2 benchmarks pass. Any Level 3 candidate must enter through the same provenance, candidate, deterministic review, human approval, and promotion boundaries. Identity drift, object mutation, temporal flicker, malformed anatomy, and invented historical detail are blockers, not acceptable side effects of richer motion.

## Risks

- Fine articulation can expose seams or missing source information.
- Excessive layer decomposition can reduce painterly cohesion.
- Character articulation can become puppet-like if every joint is animated independently.
- Secondary motion can look synthetic if all channels use simple periodic loops.
- Contact animation can reveal inaccurate masks more quickly than static composition.
- A generalized rigging framework can sprawl before the project proves what it actually needs.
- More visible motion increases the importance of full-speed human review; still-frame QA alone becomes less representative.

## Acceptance Criteria For Level 2

- Shot 3 is human-approved as unmistakably animated and source-faithful.
- Shot 4 proves numinous/environmental animation without conventional puppet behavior.
- Shot 8 proves rigid-body/environment contact motion.
- Scene data remains authoritative and reusable rather than moving behavior back into bespoke shot React code.
- New derived layers preserve provenance and explicit promotion gates.
- Deterministic QA separates camera contribution from subject/material contribution.
- The complete 60-second Level 2 Reel 1 no longer reads primarily as a slideshow or Ken Burns treatment.
- The approved Level 1 baseline remains reproducible.
- Reel 2 animation remains gated until Reel 1 Level 2 passes human publication review.

## Decision

Keep Remotion and the existing canonical production architecture. Treat Level 1 as a successful source-safe production baseline, and make **Level 2 - Living Shots** the active motion-quality milestone.

The next implementation target is not another full-reel render. It is a seven-second Shot 3 A/B benchmark that proves the pipeline can animate Enki, the Stag, water, rigging, and atmosphere as independently timed physical elements while preserving the approved art.

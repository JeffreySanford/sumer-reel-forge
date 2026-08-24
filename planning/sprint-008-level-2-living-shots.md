# Sprint 008 - Level 2 Living Shots

## Milestone Decision

Reel 1 has successfully validated the production pipeline, but the completed 60-second canonical Scene V2 reel exposed a quality gap: most shots still read as approved still artwork with restrained camera, material, and atmospheric motion rather than unmistakably animated scenes.

That result is accepted as the **Level 1 baseline**. Level 1 proved that Sumer Reel Forge can preserve source identity, create and promote reviewed layers, render an eight-shot canonical reel, audit provenance, synchronize narration, and deliver deterministic media safely.

Sprint 008 begins **Level 2 - Living Shots**.

The Level 2 goal is not maximum movement. It is to make the approved illustrated world visibly alive through source-preserving articulated 2.5D animation: independently timed character, prop, material, foreground, atmosphere, and camera motion that still looks like the approved artwork when paused.

## Why Level 2 Exists

The Reel 1 Level 1 review answered two different questions:

> Can the studio produce a complete canonical animated reel from approved assets?

Yes.

> Does the completed reel yet read as publication-quality animation rather than a cinematic layered-still treatment?

No.

This is a useful result, not a pipeline failure. The safety rails are now strong enough to support a richer motion vocabulary without abandoning provenance or human review.

## Definition Of Level 2

Level 2 is **articulated, source-preserving 2.5D animation** built from approved art and derived reviewed layers.

Level 2 may use:

- independent transform hierarchies;
- parent/child motion relationships;
- explicit pivots and anchors;
- restrained character articulation;
- head, gaze, blink, breathing, posture, and weight-shift states;
- arm/hand/prop micro-actions when the source supports them;
- rigid-body vessel motion separated from camera motion;
- rigging tension and secondary lag;
- cloth/hair response and settling;
- multi-scale water motion and contact response;
- foreground occlusion and depth parallax;
- atmosphere, light, reflection, and environmental motion;
- bounded deformation or warp masks where a rigid transform cannot produce natural movement.

Level 2 is **not**:

- uncontrolled image-to-video generation;
- source repainting for the sake of movement;
- generic perpetual zooming;
- theatrical puppet acting;
- mandatory lip sync under narrator-only voice-over;
- a requirement that every object move;
- a large general-purpose skeletal animation engine.

## Source And Approval Guardrails

The existing production philosophy remains unchanged.

- `editorial-v1` remains immutable and authoritative for source identity.
- Existing approved `animation-v1` assets remain the Level 1 canonical baseline.
- Level 2 work starts as new candidates outside canonical production locations.
- Derived articulation layers require source lineage, checksums, structural QA, and explicit human review before promotion.
- Existing Level 1 approval is not revoked merely because Level 2 seeks richer motion.
- Deterministic geometry and containment checks outrank AI claims about literal measurable facts.
- AI critique remains advisory/evidence-aware and may not approve or publish assets.
- Human review remains the final semantic, cinematic, and publication gate.
- Story and narration text are not changed to make animation easier.

## Primary Benchmark - Shot 3, Enki At The Helm

Shot 3 remains the best primary benchmark because it combines a character, a rigid vessel, water, rigging, cloth, atmosphere, and camera movement in one seven-second scene.

The Level 2 Shot 3 benchmark must look unmistakably animated at normal playback speed without losing Enki's identity or the approved visual composition.

### Desired independent motion channels

1. **Camera** - restrained push or lateral track with a deliberate settle.
2. **Vessel** - slow pitch/roll/heave independent from camera movement.
3. **Enki body** - breathing plus one subtle posture or weight shift.
4. **Head / gaze / eyes** - at most one meaningful gaze/head shift and one natural blink when the required state layer exists.
5. **Arm / tiller relationship** - a small helm or hand/tiller response if a clean derived layer can be produced without inventing anatomy.
6. **Rigging** - tension/flex/lag connected to vessel movement rather than an unrelated sine loop.
7. **Cloth / hair** - restrained secondary lag when source separation supports it.
8. **Water** - near/far motion at different scales plus a believable vessel-contact response.
9. **Foreground / atmosphere** - one depth-bearing occluder or environmental motion channel.
10. **Light / reflection** - subtle reflected-light response tied to water/material state.

Not every optional channel must survive review. The benchmark should reject motion that makes the shot busier without making it more alive.

### Minimum Level 2 motion read

The approved Shot 3 Level 2 candidate must contain:

- at least four independently timed non-camera motion channels;
- at least one genuine character-articulation channel;
- a rigid-vessel motion channel independent from the camera;
- at least one secondary-motion relationship with lag or inertia;
- material/environmental motion that does not share the same phase as the character or vessel;
- a still frame at any review marker that remains faithful to the approved art.

These are benchmark requirements, not global quotas for every later shot.

## Shot 3 Asset Preparation

Before increasing motion amplitude, inspect the existing approved Shot 3 asset set and identify which additional derived layers are actually needed.

Potential Level 2 candidates include:

- Enki head or face-state overlay;
- closed-eye/blink state;
- forearm/hand/tiller articulation region;
- robe or cloth overlay;
- foreground rigging layer;
- vessel-contact water / wake / reflection mask;
- separate near-water and distant-water regions;
- lighting/reflection mask.

Each candidate must be derived from the approved source or approved Level 1 layer. Do not create anatomy or costume detail merely because an animation control wants another layer.

## Motion Architecture

Level 2 should extend the existing Scene V2 system narrowly rather than replacing it.

Evaluate the smallest backwards-compatible additions needed for Shot 3:

- transform groups / parent-child relationships;
- explicit pivot coordinates or named pivot anchors;
- independent translate/rotate/scale channels;
- phase offset and secondary lag;
- bounded spring/easing/settle behavior;
- state events such as blink or gaze shift;
- optional deformation masks with hard displacement bounds;
- contact relationships such as vessel -> rigging and vessel -> water;
- depth order and occlusion rules;
- motion-evidence identifiers for deterministic QA.

Prefer a backwards-compatible Scene V2 extension (for example, V2.1 semantics) if possible. Introduce a new major schema version only if the current contract cannot express the required relationships cleanly.

## Deterministic QA For Living Motion

Level 1 proved that aggregate frame differences are not enough to prove convincing animation. Level 2 QA must distinguish camera motion from subject/material motion.

Add evidence for:

- per-channel contribution over review intervals;
- subject motion after compensating for camera transform;
- pivot and rotation bounds;
- maximum translation/deformation bounds;
- alpha-edge and mask containment;
- parent/child relationship consistency;
- contact continuity for vessel/water/rigging relationships;
- no one-frame pops or state flashes;
- no clipping outside the registered canvas;
- motion persistence across multiple review beats rather than one transient frame;
- terminal settling without freezing materials that should remain alive.

Do not establish global numeric animation-quality thresholds from one shot. Calibrate only after reviewed good and bad Level 2 candidates exist.

## Human Level 2 Acceptance Test

A Level 2 benchmark is not approved merely because motion QA passes.

At normal speed, without reading production notes, a reviewer should be able to say that the shot is **animated**, not merely a still image with a camera move.

Shot 3 must pass:

- Enki feels alive but not puppeted.
- The Stag feels heavy and physically connected to the water.
- Character, vessel, water, foreground, and camera do not move as one flattened plate.
- Secondary motion visibly lags its driver where appropriate.
- Motion has starts, settles, and asymmetry rather than obvious looping.
- The face and costume remain stable and recognizable.
- A paused frame remains acceptable as approved-style artwork.
- The scene still reads as calm authority rather than action spectacle.
- The Shot 3 -> Shot 4 handoff remains coherent.
- No hard-fail condition in `reel-01-animation-review-scorecard.md` is triggered.

### Required Level 1 / Level 2 A/B review

Render the existing Level 1 Shot 3 beside the Level 2 candidate.

The Level 2 candidate is not accepted unless the reviewer:

- prefers the Level 2 candidate overall;
- can identify at least three meaningful motion improvements;
- does not identify a compensating loss of source fidelity, dignity, material realism, or composition.

## Secondary Benchmark - Shot 4, Nammu Beneath The Water

Shot 4 proves that Level 2 does not mean conventional character puppetry.

Its richer motion should come primarily from:

- depth-separated currents;
- moving refraction and caustics;
- suspended particulate drift;
- foreground current occlusion;
- subtle source-coherent Nammu emergence/dissolution;
- optional source-supported cloth/hair/current interaction;
- a near-static or gently descending camera.

Nammu should continue to emerge through environmental coherence. Do not turn her into a cutout character simply because Level 2 adds articulation tools.

## Third Proof - Shot 8, Landfall

After Shot 3 and Shot 4, use Shot 8 to prove rigid-object/environment contact:

- boat movement toward or against the shoreline;
- heave/bob/settle distinct from camera movement;
- water-contact response;
- optional reeds/foreground response;
- physical settling before the final title;
- no enlargement or invented geometry merely to make the distant boat easier to animate.

## Reel 1 Rollout Order

After the three benchmark problems pass, upgrade the remaining shots in this learning-oriented order:

1. Shot 3 - character + vessel + water.
2. Shot 4 - supernatural/environmental coherence.
3. Shot 8 - rigid vessel + landfall/contact.
4. Shot 5 - hospitality scene + contained water + practical human environment.
5. Shot 7 - environmental reveal + vegetation/atmosphere/depth.
6. Shot 2 - coastline/vessel/environment motion.
7. Shot 6 - deliberately restrained practical-values montage.
8. Shot 1 - atmospheric opening; may remain the quietest shot.

A quiet shot may pass Level 2 with less movement if the stillness is intentional and contrasted by genuinely living neighboring shots. Level 2 does not require uniform motion density.

## Work Sequence

### Phase 0 - Freeze the Level 1 baseline

- [x] Preserve approved `animation-v1` assets and manifest as the Level 1 reference.
- [x] Preserve the canonical 60-second Scene V2 assembly behavior.
- [x] Record the Level 1 full-reel human finding: technically successful, visually too close to still imagery.
- [ ] Add a convenient Level 1 / Level 2 benchmark comparison command or review bundle when implementation begins.

### Phase 1 - Audit current Shot 3 motion

- [ ] Enumerate the current camera, vessel, character, water, atmosphere, and light contributions.
- [ ] Identify which apparent motion comes only from the camera.
- [ ] Identify missing articulation layers/pivots.
- [ ] Record source-safe maximum motion ranges before implementation.

### Phase 2 - Add the minimum articulation model

- [ ] Add parent/child transform support if required.
- [ ] Add explicit pivot support if required.
- [ ] Add secondary lag/inertia support.
- [ ] Add bounded state-event support for blink/gaze.
- [ ] Add optional bounded deformation only if rigid transforms are visibly insufficient.
- [ ] Keep old Scene V2 scenes valid.
- [ ] Add deterministic unit tests for every new relationship.

### Phase 3 - Prepare Shot 3 Level 2 candidates

- [ ] Produce only the new sublayers that the motion design requires.
- [ ] Run structural/source-preservation QA.
- [ ] Create a candidate manifest or revision record that references the Level 1 approved baseline.
- [ ] Keep all candidates outside canonical production until review.

### Phase 4 - Render and review Shot 3 Level 2

- [ ] Render the seven-second benchmark.
- [ ] Extract 0/25/50/75/100 review markers plus any articulation-critical frame.
- [ ] Generate contact sheet and motion evidence.
- [ ] Run deterministic motion/containment QA.
- [ ] Run evidence-aware Qwen critique as advisory review.
- [ ] Perform Level 1 / Level 2 human A/B review.
- [ ] Iterate until the shot unquestionably reads as animation.
- [ ] Promote only after explicit human approval.

### Phase 5 - Prove Shot 4 and Shot 8

- [ ] Reuse the same articulation/motion architecture for Shot 4 without conventional character performance.
- [ ] Reuse the same architecture for Shot 8 rigid-body/contact motion.
- [ ] Add only primitives justified by those shots.

### Phase 6 - Propagate to Reel 1

- [ ] Upgrade remaining shots in the rollout order.
- [ ] Preserve shot-specific stillness where intentional.
- [ ] Render the complete canonical Level 2 Reel 1.
- [ ] Reuse the approved shot-aligned narration and ambience pipeline.
- [ ] Review motion continuity, pacing, transitions, audio/image relationship, and title landing as a film.

## Level 2 Exit Criteria

Level 2 is complete only when:

- [ ] Shot 3 is human-approved as unmistakably animated and source-faithful.
- [ ] Shot 4 proves the richer system can support numinous environmental motion without puppet animation.
- [ ] Shot 8 proves rigid-body/contact motion.
- [ ] Scene V2 remains data-driven and backwards compatible, or a justified versioned successor exists.
- [ ] New articulation assets retain source lineage and explicit promotion gates.
- [ ] Deterministic QA can separate camera contribution from subject/material contribution.
- [ ] The complete 60-second Reel 1 Level 2 candidate no longer reads primarily as a slideshow or Ken Burns treatment.
- [ ] A full-reel human review passes the existing publication scorecard with no hard fails.
- [ ] The approved Level 1 baseline remains reproducible.
- [ ] Reel 2 animation may begin only after this gate is met.

## Level 3 Boundary

Selective generative image-to-video may be evaluated **after** the Level 2 benchmarks pass.

A future Level 3 experiment may compare short source-controlled generative motion against Level 2 for specific problems such as complex cloth, hair, waves, crowds, or organic environmental motion. It must not become the critical path until identity drift, object mutation, temporal flicker, malformed anatomy, and historical invention can be bounded by the same candidate/review/promotion discipline.

Do not weaken Level 2 because a generative model might solve the problem later.

## Explicitly Deferred

- full facial acting system;
- narrator lip sync;
- generalized skeletal rig authoring UI;
- broad WebGL/PixiJS migration;
- uncontrolled image-to-video production;
- Reel 2 animation production;
- generalized animation-engine features without a concrete benchmark need.

## Definition Of Done

Sprint 008 is done when Reel 1 demonstrates a repeatable **Living Shots** grammar: the artwork remains recognizably the approved source, the world contains visibly independent physical and character motion, deterministic evidence protects the source, and a human reviewer no longer describes the full reel as mostly still images with minor animation.

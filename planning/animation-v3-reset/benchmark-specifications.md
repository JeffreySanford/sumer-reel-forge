# Animation V3 Benchmark Specifications

Status: **planning contract / automation-first revision**

Updated: **2026-08-26**

Benchmarks validate reusable capabilities, not predetermined packages. Character benchmarks follow [`automation-first-character-performance.md`](./automation-first-character-performance.md).

## 1. Benchmark policy

Every benchmark records narrative/source bindings, exact fps/frame range, deterministic seed, backend/runtime ownership, named proof states, unit/render evidence, negative controls, provenance/license evidence and normal-speed human acceptance.

For default production capabilities, add:

```text
manual authoring required per new shot/reel: NO
actor/source prep reusable: YES
```

A benchmark is not complete because pixels changed or a model rendered something.

## 2. Benchmark A — Enki Automated Facial Performance

### Purpose

Prove reusable hero-character facial performance without per-shot manual rig authoring.

### Runtime/backend

- Scene V3: semantic performance + exact time authority;
- automated ActorPrepDefinition: source/regions/anchors/backend evidence;
- preferred source-preserving procedural adapter where sufficient;
- optional baked facial backend (LivePortrait candidate) behind identity/license gates;
- Remotion: production frame/render authority;
- Rive: optional/deferred comparison only, not required.

### Required semantic channels

```text
face.eye-left-open
face.eye-right-open
face.gaze-x
face.gaze-y
```

Body breathing is a separate source-supported capability and is not forced by this facial benchmark.

### Named states

```text
OPEN
CLOSING
CLOSED
OPENING
RETURNED_OPEN
GAZE_LEFT
GAZE_CENTER
```

### Machine acceptance

- source/actor-prep hashes bound;
- both eyes semantically/readably close at CLOSED;
- open identity returns cleanly;
- no debug masks/patch rectangles;
- gaze does not translate the whole actor/camera;
- same approved deterministic/baked evidence maps to the same frame state;
- model/workflow/license evidence complete for ML backend;
- no GUI editor required for another shot using the same actor profile.

### Human acceptance

- blink/gaze visible and natural at normal speed;
- identity preserved;
- no puppet/sticker/model-drift appearance;
- preferred to current rejected blink-overlay experiments.

## 3. Benchmark B — Enki at the Helm

### Purpose

Prove Level 2 composition around the accepted Shot 3 source without forcing unsupported decompositions.

### Ownership

- accepted actor-performance backend: Enki performance;
- Pixi/native 2D: source-backed composition/local material behavior where valid;
- Scene V3: timing/drivers;
- Remotion: render;
- optional Three later for spatial proof.

### Current accepted evidence

```text
camera drift
vessel heave/roll
Enki vessel carry
Enki local counter-sway/body-settle
```

### Current rejected Shot 3 channels

```text
blink overlays
whole-cutout breathing
legacy/fresh rigging extraction
legacy water extraction
```

These are not silently re-enabled to satisfy a checklist.

### Target acceptance

The mature benchmark still aims for multiple meaningful non-camera contributions (normally four or more for Level 2 hero work), but channels must be **source-supported, independently meaningful and human-readable**. A different valid channel/backend may replace a failed water/rigging/blink attempt.

Controls include accepted lower-capability baseline, actor-performance disabled, vessel disabled and camera disabled as applicable.

## 4. Benchmark C — Enlil Council Address

Prove formal acting and crowd reaction without assuming a specific rig package.

Runtime ownership:

- automated actor-prep/performance backend for Enlil;
- deterministic crowd runtime for council members;
- optional Three for blocking;
- optional Pixi/source-backed secondary materials.

Acceptance includes reusable actor prep, visible focal-speaker performance, staggered crowd reaction and no per-shot GUI rig construction.

## 5. Benchmark D — Sud / Nisaba / Haia Three-Actor Scene

Prove three independently prepared actors, eyelines/listening/speaker states, emotional change, contact-safe spacing and deterministic blocking. Actor backends may differ internally but Scene V3 semantics remain common.

Human acceptance: conversation can be followed from body/gaze state at key moments, while identities remain stable.

## 6. Benchmark E — Stag on Water Spatial Proof

Ownership:

- Three/R3F: camera/depth cards/world placement;
- Pixi/native: source-backed water/material detail where valid;
- accepted actor-performance output/card for Enki if visible;
- Remotion: frame/render authority.

No Rive assumption.

## 7. Benchmark F — Nammu Underwater

Use source-safe actor treatment or an approved automated actor backend. Generative treatment is allowed only as bounded baked evidence with identity/source QA.

## 8. Benchmark G — Kutu Hail Storm

Three/world + fixed-step/baked physics + source-backed weather/materials. Requires repeat bake hash, bounded vessel response and human storm readability.

## 9. Benchmark H — Igigi Canal Crew

Deterministic crowd/work scheduling at 1/5/20/100 scales. Workers may use reusable source/actor archetypes; no default manual rig requirement per worker.

## 10. Benchmark I — Marriage Herd Procession

Runtime candidates:

- data-driven/native repeated animal path;
- Three instancing for distance;
- optional Spine/other skeletal backend only if benchmark proves value;
- deterministic path/crowd scheduler.

No Rive prerequisite.

## 11. Benchmark J — City Growth

CityKit deterministic development states, source/evidence binding and visual identity persistence.

## 12. Benchmark K — Long Journey Montage

Explicit continuity subjects, authored transitions and time-scale metadata. Do not stretch a single opaque generated clip to represent long historical time.

## 13. Benchmark L — E-Absu Architectural Reveal

2.5D/modest spatial reconstruction with explicit literary-vs-archaeological evidence and no unapproved geometry exposure.

## 14. Proof artifact bundle

Each benchmark produces conceptually:

```text
resolved-scene.json
runtime-backend-versions.json
source-receipt.json
actor-prep-receipt.json        when actors are involved
license-evidence.json           when external code/models are involved
frame-start.png
frame-peak.png
frame-settle.png
motion-proof.mp4
deterministic-qa.json
semantic-qa.json
human-review.json
benchmark-receipt.json
```

## 15. Promotion rule

A benchmark capability becomes `production-capable` only when:

- contract/unit tests green;
- exact/baked evidence reproducible;
- source/identity proof accepted;
- negative controls behave correctly;
- model/runtime licenses resolved;
- performance/iteration cost acceptable;
- human normal-speed review approves;
- default workflow is reusable without recurring GUI authoring.

## 16. Platform readiness before broad Reel 1 migration

At minimum prove:

1. Enki actor-prep/facial performance or an explicitly accepted lower-capability substitute;
2. Enki-at-the-Helm combined source-backed proof;
3. one spatial world proof;
4. one physics/weather proof;
5. one crowd/work proof;
6. one city/world-state proof.

These are capability gates, not package-adoption gates.

## 17. Failure philosophy

Do not lower thresholds to make a milestone green, silently replace source artwork, hide failures behind camera motion, allow AI semantic review to override deterministic leakage, or add recurring manual repair because automation failed.

A rejected backend/extraction is valuable evidence and should leave the lower accepted baseline intact.

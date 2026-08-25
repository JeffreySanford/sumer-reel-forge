# Animation V3 Implementation Backlog and Phase Gates

Status: **execution plan**

This document converts the V3 planning contracts into a build sequence. It is deliberately dependency-aware so we do not install or integrate animation engines before the common timing, source and testing foundations exist.

## Phase 0 — Planning lock

Status: **substantially complete**

Deliverables:

- narrative/source map;
- Level 2 specification;
- Level 3 architecture;
- testing/provenance roadmap;
- package adoption matrix;
- Scene V3 contract design;
- benchmark specifications;
- Storybook/Animation Lab contract;
- migration/release strategy;
- performance/render budget.

Exit gate:

- no unresolved ownership conflict among Remotion, Scene V3, Rive, Pixi, Three, Rapier;
- Reel 1 reset boundary accepted;
- source/provenance hierarchy accepted.

## Phase 1 — Historical source foundation

Status: **in progress**

### 1.1 Typed source registry

- [x] create `libs/historical-sources`;
- [x] define ETCSL source records;
- [x] define adaptation classifications;
- [x] define non-ETCSL literary source type;
- [x] define visual-evidence contract;
- [x] bind initial Chapter 1–3 narrative threads;
- [x] add unit tests;
- [x] confirm local test/build green.

### 1.2 Real visual-evidence registry

- [ ] add British Museum Standard of Ur record;
- [ ] add Met Early Dynastic banquet/seal references;
- [ ] add Penn/Ubaid/Ninhursag temple references where applicable;
- [ ] record date ranges, sites, object IDs and license/status;
- [ ] mark evidence as direct/analogical/contextual.

### 1.3 Source validation tooling

- [ ] create CLI/report for unresolved source IDs;
- [ ] detect ETCSL misclassification;
- [ ] detect visual evidence with missing date/license metadata;
- [ ] emit warnings for period mismatch;
- [ ] expose stable source IDs for Studio.

### 1.4 Studio provenance surface

- [ ] read-only source card component;
- [ ] adaptation badge;
- [ ] confidence badge;
- [ ] visual-evidence card;
- [ ] warning state;
- [ ] Storybook stories;
- [ ] Angular unit tests;
- [ ] Playwright source-inspection path later.

Phase exit:

- source registry test/build green;
- at least three real museum/archaeological records;
- Studio can render source bindings read-only;
- Storybook covers all adaptation/source classes.

## Phase 2 — Scene V3 contracts

### 2.1 `animation-contracts`

- [ ] SceneV3 type;
- [ ] ActorDefinition/ActorInstance;
- [ ] PerformanceClip/Binding;
- [ ] MaterialInstance;
- [ ] EnvironmentInstance;
- [ ] CameraDefinition;
- [ ] Crowd/Herd definitions;
- [ ] SimulationBinding;
- [ ] SceneQaContract;
- [ ] RenderReceipt;
- [ ] schema/version validation.

### 2.2 `animation-frame`

- [ ] FrameContext;
- [ ] frame/time helpers;
- [ ] deterministic seed derivation by semantic channel;
- [ ] easing registry;
- [ ] stable event scheduling;
- [ ] keyframe evaluation;
- [ ] driver interface.

### 2.3 Fake runtime registry

- [ ] runtime registration;
- [ ] capability declaration;
- [ ] prepare/evaluate/evidence/dispose lifecycle;
- [ ] deterministic fake adapter;
- [ ] failure adapter;
- [ ] unsupported-capability test.

### 2.4 Resolved-scene contract

- [ ] asset/source resolution;
- [ ] runtime version resolution;
- [ ] source hashes;
- [ ] resolved props serialization;
- [ ] receipt/hash.

Phase exit:

- all contract/frame tests green;
- fake runtime can render/evaluate named proof frames;
- same frame/seed state is repeatable;
- no animation engine dependency installed yet.

## Phase 3 — Animation Lab foundation

### 3.1 React/Vite app

- [ ] create `apps/animation-lab`;
- [ ] React 19-compatible setup;
- [ ] Storybook Vite;
- [ ] Vitest browser integration;
- [ ] shared Scene V3 fixtures.

### 3.2 Global frame harness

- [ ] exact frame control;
- [ ] fps control;
- [ ] seed control;
- [ ] debug toggle;
- [ ] QA toggle;
- [ ] source/evidence panel;
- [ ] named proof-state selector.

### 3.3 Fake adapter stories

- [ ] deterministic box motion;
- [ ] parent-child proof;
- [ ] driver-lag proof;
- [ ] error state;
- [ ] source card.

### 3.4 Testing

- [ ] Storybook interaction tests;
- [ ] fixed-frame screenshot test;
- [ ] short motion proof generated from same fixture;
- [ ] browser failure diagnostics.

Phase exit:

- animation testing harness works before any real engine integration.

## Phase 4 — Pixi material runtime

### 4.1 Dependency spike

- [ ] pin PixiJS/@pixi/react exact accepted versions;
- [ ] document license/runtime requirements;
- [ ] disable autonomous ticker in production frame mode.

### 4.2 Adapter

- [ ] mesh plane;
- [ ] rope;
- [ ] displacement;
- [ ] containment;
- [ ] driver binding;
- [ ] evidence metrics.

### 4.3 Benchmarks

- [ ] water story;
- [ ] rigging story;
- [ ] reeds/cloth story;
- [ ] combined rigging + water motion proof.

Phase exit:

- deterministic material proof green;
- bounded deformation proven;
- no wall-clock dependency.

## Phase 5 — Rive performance runtime

### 5.1 Dependency/license spike

- [ ] runtime/editor licensing checkpoint;
- [ ] exact version pin;
- [ ] low-level host-driven advance/seek proof.

### 5.2 Enki rig prototype

- [ ] source preparation;
- [ ] eyes;
- [ ] gaze;
- [ ] breath;
- [ ] head/torso;
- [ ] arm/tiller channel.

### 5.3 Performance clip system

- [ ] blink-natural;
- [ ] gaze-left/right;
- [ ] breathe-calm;
- [ ] helm-rest;
- [ ] helm-gesture.

### 5.4 Benchmark

- [ ] Enki Facial Performance;
- [ ] unit/channel tests;
- [ ] Storybook states;
- [ ] fixed-frame visual proof;
- [ ] motion proof;
- [ ] human approval.

Phase exit:

- natural visible blink works without PNG-state generation;
- hero identity preserved;
- frame-driven seeking proven.

## Phase 6 — Three/R3F spatial runtime

### 6.1 Dependencies

- [ ] Three;
- [ ] R3F React-19-compatible version;
- [ ] Drei as justified;
- [ ] `@remotion/three` exact Remotion version.

### 6.2 Adapter

- [ ] depth cards;
- [ ] camera;
- [ ] billboard actors;
- [ ] lights/fog;
- [ ] texture/source binding;
- [ ] debug frustum/depth overlay.

### 6.3 Benchmark

- [ ] Stag on Water Spatial Proof;
- [ ] no hidden geometry exposure;
- [ ] exact-frame camera proofs;
- [ ] fixed-frame visual regression.

Phase exit:

- painterly 2.5D survives real spatial camera movement.

## Phase 7 — Combined Reel 1 platform proof

### 7.1 Enki at Helm V3

- [ ] Rive Enki;
- [ ] Pixi rigging/water;
- [ ] R3F boat/world placement;
- [ ] Scene V3 timing/drivers;
- [ ] Remotion render.

### 7.2 Controls

- [ ] Level 1 baseline;
- [ ] character frozen;
- [ ] material frozen;
- [ ] vessel/camera controls.

### 7.3 Human gate

- [ ] normal-speed A/B;
- [ ] at least three meaningful improvements;
- [ ] no source-fidelity loss.

Phase exit:

- first combined V3 shot proves architecture earns its complexity.

## Phase 8 — Rapier physics

- [ ] fixed-step simulation harness;
- [ ] construction-order hashing;
- [ ] bake format;
- [ ] bake receipt;
- [ ] playback adapter;
- [ ] Kutu Hail benchmark;
- [ ] same-seed bake repeat;
- [ ] human storm review.

Phase exit:

- approved physics can be baked and replayed deterministically.

## Phase 9 — Crowd/work runtime

- [ ] deterministic agent identity;
- [ ] clip scheduler;
- [ ] region/path assignment;
- [ ] role variation;
- [ ] synchronization metric;
- [ ] 1/5/20/100 Storybook states;
- [ ] Igigi Canal Crew benchmark;
- [ ] performance receipt.

Phase exit:

- 100-agent benchmark practical on target workstation;
- crowd does not read as synchronized clones.

## Phase 10 — Animal/herd strategy

- [ ] Spine license/authoring evaluation;
- [ ] Rive alternative evaluation;
- [ ] LOD/instancing strategy;
- [ ] path/gait synchronization;
- [ ] Marriage Herd Procession benchmark;
- [ ] keep/constrain/reject Spine decision.

## Phase 11 — CityKit/world states

- [ ] CityDefinition contracts;
- [ ] geography/water networks;
- [ ] architecture palettes;
- [ ] agriculture/industry profiles;
- [ ] vegetation/livestock;
- [ ] development states;
- [ ] Eridu prototype;
- [ ] source/evidence panel;
- [ ] City Growth benchmark.

Phase exit:

- one city evolves deterministically while retaining visual identity.

## Phase 12 — Montage runtime

- [ ] segment contract;
- [ ] continuity subjects;
- [ ] transition styles;
- [ ] time-scale labels;
- [ ] source/adaptation metadata by segment;
- [ ] Long Journey benchmark.

## Phase 13 — Theatre authoring bridge

- [ ] visual authoring spike;
- [ ] camera/light/object tracks;
- [ ] export state;
- [ ] compile to Scene V3;
- [ ] round-trip tests;
- [ ] production build excludes Studio runtime where intended.

## Phase 14 — Unified evidence/QA

- [ ] runtime-independent evidence receipt;
- [ ] fixed-frame proof bundle;
- [ ] motion proof bundle;
- [ ] semantic QA contract;
- [ ] human review receipt;
- [ ] performance receipt;
- [ ] historical-source receipt;
- [ ] rendered actual-asset binding.

## Phase 15 — Reel 1 migration

Order:

1. Shot 3;
2. Shot 4;
3. Shot 8;
4. Shot 5;
5. Shot 7;
6. Shot 2;
7. Shot 6;
8. Shot 1.

Each shot remains dual-rendered against its approved baseline until promoted.

## Phase 16 — Chapter 2 readiness

Required:

- Enlil hero rig;
- council crowd;
- 3-actor conversation;
- procession;
- herd runtime;
- formal speech performance clips.

## Phase 17 — Chapter 3 readiness

Required:

- CityKit;
- work crews;
- agriculture/construction clips;
- world states;
- waterways;
- montage/time compression;
- crowd and LOD performance budgets.

## Cross-phase testing requirements

Every phase with visual output adds, as applicable:

- unit tests;
- Storybook stories;
- interaction tests;
- fixed-frame visual tests;
- short motion proof;
- semantic QA;
- Playwright workflow coverage;
- human review.

## Pull request sizing

Prefer capability slices rather than hundreds of micro-commits or one huge platform PR.

Suggested slice examples:

```text
FrameContext + tests
Runtime registry + fake adapter
Animation Lab harness
Pixi rope proof
Rive blink proof
R3F depth-card proof
```

## Stop conditions

Stop a phase and reassess if:

- runtime cannot obey exact-frame authority;
- source identity cannot be preserved;
- Storybook/render states disagree;
- package license blocks intended use;
- local iteration time becomes impractical;
- final rendered semantics fail despite internal engine state passing;
- integration requires hidden mutable editor state.

## Overall completion condition

The reset is successful when ordinary Chapters 1–3 animation can be expressed by reusable platform primitives rather than creating a new bespoke technical subsystem for each shot.

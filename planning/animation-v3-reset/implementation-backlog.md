# Animation V3 Implementation Backlog and Phase Gates

Status: **active execution plan**

Updated: **2026-08-26**

This document converts the V3 planning contracts into a dependency-aware build sequence. It is also the canonical phase checklist: completed items must reflect repository evidence, not aspiration.

Legend:

```text
[x] implemented and verified at the current intended foundation scope
[~] partially implemented / foundation exists, but the phase capability is not complete
[ ] not yet implemented
```

For a narrative explanation of the current architecture, verified tests, dual Angular/React UI roles, local workstation topology, and detailed next steps, see [`current-implementation-status-and-roadmap.md`](./current-implementation-status-and-roadmap.md).

---

## Phase 0 — Planning lock

Status: **COMPLETE**

Deliverables:

- [x] narrative/source map;
- [x] Level 2 specification;
- [x] Level 3 architecture;
- [x] testing/provenance roadmap;
- [x] package adoption matrix;
- [x] Scene V3 contract design;
- [x] benchmark specifications;
- [x] Storybook/Animation Lab contract;
- [x] migration/release strategy;
- [x] performance/render budget;
- [x] runtime ownership/time-authority ADRs;
- [x] source/provenance hierarchy.

Exit gate:

- [x] no unresolved ownership conflict among Remotion, Scene V3, Rive, Pixi, Three, Rapier;
- [x] Reel 1 reset boundary defined;
- [x] source/provenance hierarchy defined.

---

## Phase 1 — Historical source foundation

Status: **PARTIAL — CORE CONTRACTS WORKING, CORPUS/STUDIO UX INCOMPLETE**

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

- [x] bind a Standard of Ur visual-evidence record into the golden Scene V3 proof path;
- [ ] add broader British Museum evidence needed by production scenes;
- [ ] add Met Early Dynastic banquet/seal references where production-relevant;
- [ ] add Penn/Ubaid/Ninhursag temple references where applicable;
- [~] record date ranges, sites, object IDs and license/status for the active corpus;
- [~] classify evidence as direct/analogical/contextual across the active corpus.

### 1.3 Source validation tooling

- [ ] create CLI/report for unresolved source IDs;
- [ ] detect ETCSL misclassification;
- [ ] detect visual evidence with missing date/license metadata;
- [ ] emit warnings for period mismatch;
- [x] expose stable source IDs to compiled Scene V3/inspection paths.

### 1.4 Studio provenance surface

- [~] read-only provenance information exists in the broader application/inspection architecture;
- [ ] complete Angular source card component contract in production UI;
- [ ] adaptation badge in Angular Studio;
- [ ] confidence badge in Angular Studio;
- [ ] visual-evidence card in Angular Studio;
- [ ] source warning/stale state in Angular Studio;
- [ ] Angular Storybook coverage;
- [ ] Angular unit tests for final provenance workflow;
- [ ] Playwright source-inspection path.

Phase exit:

- [x] source registry test/build green;
- [~] at least three real museum/archaeological records in production-ready corpus;
- [ ] Angular Studio can render complete source bindings read-only;
- [ ] Storybook covers all adaptation/source classes.

---

## Phase 2 — Scene V3 contracts, compiler and deterministic runtime

Status: **CORE COMPLETE**

### 2.1 `animation-contracts`

- [x] `SceneV3` type;
- [x] actor/prop/environment definitions and instances required by the current contract;
- [x] performance binding contract;
- [x] material/effect tracks;
- [x] camera track contract;
- [x] crowd/herd contract surfaces;
- [x] simulation binding contract;
- [x] world-state/montage contract surfaces;
- [x] `SceneQaContract`;
- [x] schema/version validation.

Note: contract existence does not mean the later crowd/herd/physics/world runtimes are implemented.

### 2.2 `animation-frame`

- [x] frame context foundation;
- [x] frame/time helpers used by V3/runtime evaluation;
- [x] deterministic scene/semantic seed use at current foundation scope;
- [x] deterministic exact-frame evaluation contract;
- [~] generalized easing/event/keyframe/driver catalog sufficient for later production breadth.

### 2.3 Runtime registry

- [x] runtime registration;
- [x] capability declaration;
- [x] prepare/evaluate lifecycle;
- [x] deterministic fake adapter;
- [x] failure behavior;
- [x] unsupported-runtime/capability tests;
- [x] deterministic repeated-evaluation assertion.

### 2.4 Resolved-scene compiler

- [x] source resolution;
- [x] visual-evidence resolution;
- [x] asset/source binding;
- [x] runtime version/definition resolution;
- [x] semantic seed resolution;
- [x] canonical serialization;
- [x] source scene hash;
- [x] resolved scene hash;
- [x] receipt/identity tests;
- [x] canonical JSON hardening.

### 2.5 Golden integration fixture

- [x] Enki-at-the-Helm Scene V3 fixture;
- [x] pinned source/resolved hashes;
- [x] 30 fps / 210 frames / 1080×1920 contract;
- [x] integer authored scene seed;
- [x] runtime bindings;
- [x] semantic seeds;
- [x] QA contracts;
- [x] named proof frames;
- [x] parent relationship between Enki and the Stag vessel.

### 2.6 Scene V2 compatibility

- [x] adapt the real Shot 3 Scene V2 benchmark to valid Scene V3;
- [x] preserve timing/frame bounds;
- [x] preserve source identity/policy;
- [x] preserve camera semantics;
- [x] reject invented immutable asset bindings;
- [x] reject story-mutation permission drift;
- [x] compiler integration tests green.

Phase exit:

- [x] core contract/frame/compiler/runtime tests green;
- [x] fake runtime evaluates named proof frames deterministically;
- [x] same frame/seed state is repeatable;
- [x] Scene V2 production work has a compatibility path;
- [x] first real engine was not introduced until this foundation existed.

---

## Phase 2.5 — Animation inspection foundation

Status: **COMPLETE FOR CURRENT LAB SCOPE**

This emerged as the engine-neutral UI boundary between Phase 2 and Phase 3.

- [x] create `libs/animation-inspection`;
- [x] exact-frame view model;
- [x] frame stepping/jump/home/end;
- [x] logical hierarchy projection;
- [x] provenance/evidence projection;
- [x] QA status projection with `NOT_RUN` preserved;
- [x] runtime/asset/seed diagnostics;
- [x] source/resolved hash diagnostics;
- [x] proof-state activation;
- [x] boundary policy forbidding React/Angular/Remotion/Pixi/Three/Rive/browser clocks/global randomness;
- [x] golden compiler → inspection integration test.

---

## Phase 3 — Animation Lab foundation

Status: **CORE COMPLETE**

### 3.1 React/Vite app

- [x] create `apps/animation-lab`;
- [x] React/Vite setup;
- [x] Storybook Vite;
- [x] Vitest/jsdom unit setup;
- [x] Playwright E2E project;
- [x] shared/pinned Scene V3 inspection fixture;
- [x] production build;
- [x] stable workstation dev port `4300` configured in current branch.

### 3.2 Exact-frame harness

- [x] exact integer frame control;
- [x] current fps/time/progress display;
- [x] named proof-state selector;
- [x] keyboard single-frame stepping;
- [x] bounded home/end behavior;
- [x] source/evidence diagnostics;
- [x] QA visibility without presumed pass;
- [ ] editable seed control if/when authoring use requires it;
- [ ] editable fps control if/when authoring use requires it;
- [ ] explicit debug/QA overlay toggles beyond current diagnostics.

### 3.3 Deterministic fake runtime preview

- [x] exact-frame fake runtime evaluation;
- [x] environment/prop/actor diagnostic drawing;
- [x] parent-child composition;
- [x] recursive parent-chain diagnostics;
- [x] local vs composed transforms;
- [x] runtime capabilities;
- [x] missing-parent failure;
- [x] cycle failure policy;
- [x] unsupported runtime failure;
- [x] error state;
- [x] empty state;
- [x] deterministic repeated evaluation;
- [x] authored scene seed requirement.

### 3.4 Evidence and viewport diagnostics

- [x] derive viewport from resolved scene frame dimensions;
- [x] show 1080×1920 / 9:16 golden contract;
- [x] source/resolved evidence binding;
- [x] `BOUND` vs `STALE` status;
- [x] evidence counts;
- [x] resolved hash display;
- [x] runtime node diagnostic table.

### 3.5 Storybook

- [x] START proof state;
- [x] BLINK_CLOSED proof state;
- [x] end-state story;
- [x] runtime error story;
- [x] empty runtime story;
- [x] stale-evidence story;
- [x] diagnostic fallback story;
- [x] real Pixi-backed default story after Phase 4 foundation.

### 3.6 Testing

- [x] deterministic unit tests;
- [x] runtime preview model tests;
- [x] app interaction tests;
- [x] Chromium E2E;
- [x] Firefox E2E;
- [x] WebKit E2E;
- [ ] fixed-frame screenshot regression for a source-backed visual benchmark;
- [ ] short deterministic motion proof generated from the same fixture/evaluator;
- [~] browser failure diagnostics beyond current explicit runtime/Pixi status.

Phase exit:

- [x] animation testing harness works before production engine material/character adoption;
- [x] exact frame remains authoritative;
- [x] inspection remains available when a visual adapter fails;
- [x] QA/evidence state is visible without being fabricated.

---

## Phase 3.5 — Local workstation integration

Status: **IMPLEMENTED ON CURRENT BRANCH; LOCAL SMOKE TEST PENDING**

The Lab is now common enough to be part of the persistent workstation startup.

- [x] reserve Angular Studio on `4200`;
- [x] move Animation Lab Vite dev/preview default to `4300`;
- [x] align Animation Lab Playwright default URL to `4300`;
- [x] add `4300` to `start:all` port preflight;
- [x] launch `nx serve animation-lab --port=4300` from `start:all`;
- [x] wait for 4300 readiness before reporting workstation ready;
- [x] include Animation Lab in Windows repo-local cleanup detection;
- [x] include Animation Lab in Ctrl+C managed shutdown;
- [x] print Angular Studio and Animation Lab URLs separately;
- [ ] local `pnpm start:all` smoke test with 3000/4200/4300 all reachable;
- [ ] local Ctrl+C shutdown proof with all managed dev listeners released.

Expected persistent workflow:

```text
Terminal A: pnpm start:all
Terminal B: tests / scripts / render / Git commands
Browser:    Angular Studio on 4200 + Animation Lab on 4300
```

---

## Phase 4 — Pixi material runtime

Status: **FOUNDATION STARTED — ENGINE SURFACE PROVEN, MATERIAL SYSTEM NOT YET BUILT**

### 4.1 Dependency/adoption spike

- [x] pin `pixi.js` exact accepted version `8.20.0`;
- [x] document official package/repository and MIT license;
- [x] keep Pixi third-party import inside `libs/animation-pixi`;
- [x] add boundary test rejecting sibling direct Pixi imports;
- [x] record lockfile diff;
- [x] production dependency audit green at verification time;
- [x] measure bundle size;
- [x] Storybook build with installed dependency;
- [x] Chromium/Firefox/WebKit E2E;
- [x] adapter/unit tests;
- [x] document uninstall/reject path.

### 4.2 Exact-frame engine surface

- [x] framework-neutral `PixiPreviewSurface` contract;
- [x] WebGL application initialization;
- [x] `autoStart: false`;
- [x] `sharedTicker: false`;
- [x] ticker explicitly stopped;
- [x] no adapter `requestAnimationFrame` loop;
- [x] explicit one-pass render per immutable exact-frame plan;
- [x] deterministic diagnostic geometry;
- [x] viewport mismatch rejection;
- [x] node-count consistency validation;
- [x] destroy/lifecycle behavior;
- [x] actual browser canvas proof.

### 4.3 Source-backed visual binding

- [ ] load a real existing Shot 3 visual asset through Pixi;
- [ ] verify checksum/hash binding before draw;
- [ ] source-space → output-space registration;
- [ ] preserve painterly source identity;
- [ ] fixed-frame browser screenshot proof;
- [ ] stale/missing asset failure states.

### 4.4 Material behavior

- [ ] water material proof;
- [ ] mesh/displacement approach only if benchmark requires it;
- [ ] rope/rigging proof only if benchmark requires it;
- [ ] bounded containment/deformation;
- [ ] driver binding;
- [ ] evidence metrics;
- [ ] no wall-clock dependency.

### 4.5 Benchmarks

- [ ] source-backed water story;
- [ ] source-backed rigging story;
- [ ] reeds/cloth story if still production-relevant;
- [ ] combined rigging + water motion proof;
- [ ] normal-speed human A/B.

Phase exit:

- [ ] deterministic material proof green;
- [ ] bounded deformation proven;
- [x] engine time authority constrained;
- [ ] source-backed output visibly improves a production benchmark;
- [ ] human review supports continuing Pixi for that capability.

---

## Phase 5 — Rive performance runtime

Status: **NOT STARTED**

### 5.1 Dependency/license spike

- [ ] runtime/editor licensing checkpoint;
- [ ] exact version pin;
- [ ] low-level host-driven advance/seek proof;
- [ ] prove no autonomous story-time ownership.

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

- [ ] natural visible blink works without PNG-state generation;
- [ ] hero identity preserved;
- [ ] frame-driven seeking proven;
- [ ] runtime complexity earns visible production value.

---

## Phase 6 — Three/R3F spatial runtime

Status: **NOT STARTED**

### 6.1 Dependencies

- [ ] Three;
- [ ] R3F React-compatible version;
- [ ] Drei only as justified;
- [ ] `@remotion/three` exact Remotion-compatible version if production rendering requires it.

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
- [ ] fixed-frame visual regression;
- [ ] performance receipt.

Phase exit:

- [ ] painterly 2.5D survives real spatial camera movement;
- [ ] spatial runtime is justified by visible value rather than package availability.

---

## Phase 7 — Combined Reel 1 V3 platform proof

Status: **NOT STARTED**

### 7.1 Enki at Helm V3

- [ ] Rive Enki if Phase 5 is accepted;
- [ ] Pixi rigging/water if Phase 4 is accepted;
- [ ] Three/R3F placement only if Phase 6 is accepted;
- [ ] Scene V3 timing/drivers;
- [ ] Remotion render path consuming approved V3 result/state.

### 7.2 Controls

- [ ] Level 1 baseline;
- [ ] character frozen;
- [ ] material frozen;
- [ ] vessel/camera controls;
- [ ] source-fidelity comparison.

### 7.3 Human gate

- [ ] normal-speed A/B;
- [ ] at least three meaningful improvements;
- [ ] no source-fidelity loss;
- [ ] explicit human acceptance receipt.

Phase exit:

- [ ] first combined V3 shot proves architecture earns its complexity.

---

## Phase 8 — Rapier physics

Status: **NOT STARTED**

- [ ] fixed-step simulation harness;
- [ ] construction-order hashing;
- [ ] bake format;
- [ ] bake receipt;
- [ ] playback adapter;
- [ ] Kutu Hail benchmark;
- [ ] same-seed bake repeat;
- [ ] human storm review.

Phase exit:

- [ ] approved physics can be baked and replayed deterministically.

---

## Phase 9 — Crowd/work runtime

Status: **NOT STARTED BEYOND CONTRACT SURFACES**

- [ ] deterministic agent identity runtime;
- [ ] clip scheduler;
- [ ] region/path assignment;
- [ ] role variation;
- [ ] synchronization metric;
- [ ] 1/5/20/100 Storybook states;
- [ ] Igigi Canal Crew benchmark;
- [ ] performance receipt.

Phase exit:

- [ ] 100-agent benchmark practical on target workstation;
- [ ] crowd does not read as synchronized clones.

---

## Phase 10 — Animal/herd strategy

Status: **NOT STARTED BEYOND CONTRACT SURFACES**

- [ ] Spine license/authoring evaluation;
- [ ] Rive alternative evaluation;
- [ ] LOD/instancing strategy;
- [ ] path/gait synchronization;
- [ ] Marriage Herd Procession benchmark;
- [ ] keep/constrain/reject Spine decision.

---

## Phase 11 — CityKit/world states

Status: **PLANNED / NOT IMPLEMENTED AS RUNTIME**

- [ ] CityDefinition implementation;
- [ ] geography/water networks;
- [ ] architecture palettes;
- [ ] agriculture/industry profiles;
- [ ] vegetation/livestock;
- [ ] development states;
- [ ] Eridu prototype;
- [ ] source/evidence panel integration;
- [ ] City Growth benchmark.

Phase exit:

- [ ] one city evolves deterministically while retaining visual identity.

---

## Phase 12 — Montage runtime

Status: **NOT STARTED**

- [ ] segment runtime contract implementation;
- [ ] continuity subjects;
- [ ] transition styles;
- [ ] time-scale labels;
- [ ] source/adaptation metadata by segment;
- [ ] Long Journey benchmark.

---

## Phase 13 — Theatre authoring bridge

Status: **NOT STARTED**

- [ ] visual authoring spike;
- [ ] camera/light/object tracks;
- [ ] export state;
- [ ] compile/export to Scene V3;
- [ ] round-trip tests;
- [ ] production build excludes Studio authoring runtime where intended.

Theatre remains authoring-only by policy unless a later ADR explicitly changes that.

---

## Phase 14 — Unified evidence/QA

Status: **FOUNDATION PARTIAL**

Existing source hashes, resolved hashes, runtime diagnostics, QA contracts, proof states and existing Scene V2 review/promotion evidence provide pieces of this phase, but the unified V3 receipt system is not complete.

- [~] runtime-independent evidence concepts;
- [~] fixed-frame proof concepts;
- [~] semantic QA contract foundation;
- [~] human review receipt patterns in existing production pipeline;
- [~] historical-source receipt foundation;
- [ ] unified V3 runtime evidence receipt;
- [ ] unified fixed-frame proof bundle;
- [ ] unified motion proof bundle;
- [ ] unified performance receipt;
- [ ] rendered actual-asset binding for production V3 output;
- [ ] V3 promotion transaction integration.

---

## Phase 15 — Reel 1 migration

Status: **NOT STARTED AS PRODUCTION V3 PROMOTION**

Current Scene V2/Remotion Reel 1 remains authoritative.

Planned order:

1. Shot 3;
2. Shot 4;
3. Shot 8;
4. Shot 5;
5. Shot 7;
6. Shot 2;
7. Shot 6;
8. Shot 1.

Each shot remains dual-rendered against its approved baseline until explicitly promoted.

Do not infer migration from Animation Lab success.

---

## Phase 16 — Chapter 2 readiness

Status: **NOT STARTED**

Required:

- [ ] Enlil hero rig;
- [ ] council crowd;
- [ ] 3-actor conversation;
- [ ] procession;
- [ ] herd runtime;
- [ ] formal speech performance clips.

---

## Phase 17 — Chapter 3 readiness

Status: **NOT STARTED**

Required:

- [ ] CityKit;
- [ ] work crews;
- [ ] agriculture/construction clips;
- [ ] world states;
- [ ] waterways;
- [ ] montage/time compression;
- [ ] crowd and LOD performance budgets.

---

## Cross-phase Studio/API orchestration backlog

The long-term direction is to move common command-line workflows into Angular Studio through typed methods/jobs while preserving CLI parity.

### Near-term

- [ ] Angular action to open Animation Lab for selected semantic scene/shot;
- [ ] Lab deep-link route carrying scene/revision/frame identity;
- [ ] API endpoint/service to load resolved Scene V3 by stable identity/hash;
- [ ] Lab uses API/shared resolved state for normal use while retaining golden fixtures for tests.

### Script-to-method migration

Do **not** expose generic shell execution.

Incrementally create allowlisted typed operations:

- [ ] prepare shot assets;
- [ ] generate candidate;
- [ ] verify candidate;
- [ ] render proof;
- [ ] run material QA;
- [ ] compile Scene V3;
- [ ] render named proof state;
- [ ] create promotion plan;
- [ ] apply promotion only with required QA/human evidence.

### Job system

- [ ] persisted job ID/type/input;
- [ ] structured progress/log stream;
- [ ] cancellation where safe;
- [ ] output artifact IDs/hashes;
- [ ] retry policy where safe;
- [ ] idempotency/current-revision checks;
- [ ] explicit human-review requirements;
- [ ] no implicit promotion.

---

## Cross-phase testing requirements

Every phase with visual output adds, as applicable:

- unit tests;
- boundary/policy tests;
- Storybook stories;
- interaction tests;
- fixed-frame visual tests;
- short motion proof;
- semantic QA;
- Playwright workflow coverage;
- performance evidence;
- human review.

Current principle:

> A green automated test proves the contract it tests. It does not prove human visual acceptance.

---

## Current verified quality baseline

Latest Pixi foundation verification recorded before the current 4300/startup change:

```text
animation-pixi tests        4/4
animation-lab tests        20/20
animation-lab E2E           3/3 browsers
animation-v3 integration   10/10
renderer                   124 pass / 2 intentional skips / 0 fail
workspace lint              14 projects
workspace build             12 projects
workspace test              12 projects
prod dependency audit       no known vulnerabilities
```

The port/startup change still requires a focused rerun and `pnpm start:all` smoke test before merge.

---

## Pull request/branch sizing

Prefer capability slices rather than hundreds of micro-commits or one huge platform PR.

Good slice examples:

```text
FrameContext + tests
Runtime registry + fake adapter
Animation Lab inspection shell
Deterministic runtime preview
Preview diagnostics
Pixi exact-frame surface
Pixi source-backed asset proof
Pixi water material proof
Rive blink proof
R3F depth-card proof
Studio → Lab deep link
Typed render-proof API job
```

---

## Stop conditions

Stop a phase and reassess if:

- runtime cannot obey exact-frame authority;
- source identity cannot be preserved;
- Storybook/Lab/render states disagree;
- package license blocks intended use;
- local iteration time becomes impractical;
- final rendered semantics fail despite internal engine state passing;
- integration requires hidden mutable editor state;
- a runtime only works by moving story time into a child ticker;
- UI-driven execution would require unsafe arbitrary shell access;
- production promotion cannot remain explicit and receipt-backed.

---

## Immediate next execution order

1. locally verify the 4300/start:all integration;
2. merge the current Pixi/startup/documentation branch;
3. load one real checksum-bound Shot 3 source asset into Pixi;
4. prove registration and exact-frame rendering;
5. add one bounded Pixi material behavior;
6. connect Animation Lab to dynamically resolved Scene V3 identity;
7. add Angular Studio → Animation Lab semantic deep link;
8. begin safe typed script/job migration behind the API;
9. only then begin the Rive hero-performance spike;
10. add Three/R3F only after a real spatial benchmark justifies it.

---

## Overall completion condition

The reset is successful when ordinary Chapters 1–3 animation can be expressed by reusable, deterministic, source-aware platform primitives rather than creating a new bespoke technical subsystem for each shot, while Angular Studio provides the normal operational workflow and specialist runtimes remain replaceable behind explicit adapters.

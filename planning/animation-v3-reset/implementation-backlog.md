# Animation V3 Implementation Backlog and Phase Gates

Status: **active execution plan**

Updated: **2026-08-27**

This checklist reflects repository evidence, not aspiration. The production character path is governed by [`automation-first-character-performance.md`](./automation-first-character-performance.md).

Legend:

```text
[x] implemented and locally verified at intended scope
[~] implemented on branch / awaiting local verification or broader completion
[ ] not implemented
[!] rejected/deferred by evidence
```

## Phase 0 — Planning lock

Status: **COMPLETE**

- [x] Scene V3 authority and runtime ownership;
- [x] deterministic FrameContext;
- [x] source/provenance hierarchy;
- [x] testing/promotion/human-gate policy;
- [x] Level 2/3 boundaries;
- [x] automation-first actor-performance policy added after Shot 3 evidence.

## Phase 1 — Historical-source foundation

Status: **PARTIAL**

- [x] typed source registry foundation;
- [x] literary/adaptation/visual-evidence contracts;
- [x] source IDs and resolved-scene binding;
- [~] broader museum/archaeological corpus;
- [ ] complete Angular provenance UX;
- [ ] source-validation/period/license reporting.

## Phase 2 — Scene V3/compiler/runtime

Status: **CORE COMPLETE**

- [x] `animation-contracts`;
- [x] `animation-frame`;
- [x] runtime registry;
- [x] resolved-scene compiler;
- [x] Enki-at-the-Helm golden fixture;
- [x] V2 compatibility path;
- [x] deterministic repeated evaluation.

## Phase 2.5 — Animation inspection

Status: **COMPLETE FOR CURRENT LAB SCOPE**

- [x] exact-frame view model;
- [x] hierarchy/provenance/QA/runtime diagnostics;
- [x] engine/UI/time-authority boundary policy.

## Phase 3 — Animation Lab

Status: **CORE COMPLETE**

- [x] React/Vite app;
- [x] Storybook/Vitest/Playwright;
- [x] exact-frame controls;
- [x] deterministic runtime inspection;
- [x] Pixi-backed specialist proof surface;
- [x] workstation port 4300 integration.

## Phase 4 — Pixi / source-backed Shot 3 proof

Status: **PARTIAL — ACCEPTED BASELINE, SECONDARY LIMITS DISCOVERED**

### Accepted

- [x] Pixi 8.20.0 isolated adapter/time authority;
- [x] source hash verification and registration;
- [x] recovered background/vessel/Enki proof lane;
- [x] exact-frame cinematic camera;
- [x] vessel heave/roll;
- [x] nested Enki local counter-sway/body-settle;
- [x] technical repeatability and human acceptance of current baseline.

### Rejected/disabled evidence

- [!] canonical blink overlay — human-invisible;
- [!] stronger blink replacement — human-invisible;
- [!] legacy water extraction — sparse/non-basin;
- [!] legacy rigging extraction — sparse fragments;
- [!] bounded fresh rigging ROI — no source-safe survivor;
- [!] whole-cutout breathe-calm — technically green, human preferred control.

### Remaining Phase 4

- [~] recovered Shot 3 motion decision packet compares primary, counter-sway and breathe-calm stacks using technical receipts plus built-in AI advisory reviews;
- [ ] human accept/reject one recovered Shot 3 motion stack from the decision packet;
- [ ] reusable source-backed material/deformation primitive on a source that actually supports it;
- [ ] fixed-frame visual regression for an accepted source-backed benchmark;
- [ ] broader material proof only where source decomposition is trustworthy.

Phase exit is **not** achieved merely by increasing motion-channel count.

## Phase 5 — Automated actor preparation/performance

Status: **ACTIVE — SOURCE IDENTITY VERIFIED; SEMANTIC DISCOVERY GEOMETRY STOP**

### 5.0 Rive boundary experiment

- [x] `libs/animation-rive` neutral contract foundation;
- [x] no-autoplay/no-autonomous-clock tests;
- [x] byte-identical Enki neutral prep and SHA receipt;
- [x] candidate handoff safety checker;
- [!] Rive runtime install deferred;
- [!] manual `.riv` authoring rejected as production critical path.

The Rive work remains evidence/optional adapter scaffolding; it is not deleted and is not the default pipeline. A missing `rive` shell command is non-blocking under this policy.

### 5.1 Actor-prep contracts

- [x] engine-neutral `ActorPrepDefinition` and validation;
- [x] semantic regions, landmarks/anchors and backend evidence modeled;
- [x] manual-editor/time-authority/license-blocked negative tests;
- [x] local `animation-contracts` verification: 18/18 PASS + build PASS on 2026-08-27;
- [ ] integrate actor-prep identity into resolved Scene V3 when the shape is proven beyond this proof lane.

### 5.2 Automated Enki prep

- [x] latest accepted recovered Enki source discovery;
- [x] SHA/dimension verification;
- [x] candidate-only packet under `tmp/animation-assets/actor-prep/enki/v1`;
- [x] desired semantic regions/anchors encoded as `pending-auto-discovery`;
- [x] native/LivePortrait/Rive backend status encoded;
- [x] zero manual-editor/model invocation receipt;
- [x] local packet run verified on 2026-08-27.

Verified evidence:

```text
source sha256:d19ff6b4810a6fad5b8ce41232e07d7fc0f72923799e195df1596f53f4239f07
source 941x1672
actor-prep definition sha256:81b39d95d47ecbade72a7c1b861619d7271a465050a3a70d51d4789ff18fa606
manual editor invocations 0
model invocations 0
```

### 5.3 Automated semantic discovery

- [~] head/face/torso/arm/hand region discovery implemented with two Qwen3-VL locator passes;
- [~] landmark/anchor proposal with confidence and two-pass spatial agreement;
- [~] deterministic normalized geometry validation: bounds, containment, crown/head attachment and anchor ownership;
- [~] invalid proxy-geometry diagnostics preserved before/after the single bounded coordinate repair;
- [~] standalone semantic review SVG + consensus/QA/receipt artifacts;
- [~] reject/disqualify unstable or unsupported semantic locations instead of manual coordinate repair;
- [~] local run reached real Enki anatomy detection, then stopped on invalid crop-normalized hand geometry;
- [ ] successful local run/receipt verification of structurally contained semantic discovery;
- [~] human review is the next gate after a structurally contained run, before any extraction/segmentation;
- [ ] source-pixel fidelity checks for extracted semantic region assets;
- [ ] region extraction/segmentation only after accepted semantic locations.

Semantic discovery is localization only. It must not mutate source pixels, actor-prep identity or canonical assets, and it cannot promote itself. Missing or unsupported hands should disable hand/contact capability rather than block facial/torso capability; invalid geometry still blocks remap and must be diagnosed.

### 5.4 Performance template/bake contract

- [ ] semantic clip → backend mapping;
- [ ] motion-template/driving-input hash support;
- [ ] baked-output hash and frame mapping;
- [ ] source/model/workflow/license evidence;
- [ ] stale evidence invalidation.

### 5.5 Optional LivePortrait spike

- [ ] license preflight before install;
- [ ] replace/resolve non-commercial InsightFace detection dependency for commercial use;
- [ ] pinned backend/model versions;
- [ ] headless CLI proof;
- [ ] reusable motion-template proof;
- [ ] identity stability A/B;
- [ ] no camera/body-root contamination;
- [ ] baked candidate repeat/provenance receipt;
- [ ] human normal-speed approval.

No production adoption while license or identity gate is unresolved.

### 5.6 Enki facial benchmark

- [ ] neutral identity;
- [ ] blink/gaze candidate;
- [ ] exact/baked frame mapping;
- [ ] negative fixtures;
- [ ] normal-speed human preference over accepted lower-capability baseline;
- [ ] reuse proof across more than one shot without GUI authoring.

## Phase 6 — Three/R3F spatial runtime

Status: **NOT STARTED**

- [ ] dependency/version spike;
- [ ] painted depth-card adapter;
- [ ] camera/depth/occlusion proof;
- [ ] source-safe spatial benchmark;
- [ ] no invented geometry exposure.

## Phase 7 — Combined Reel 1 V3 proof

Status: **NOT STARTED**

Required:

- [ ] accepted actor-performance backend or accepted lower-capability actor state;
- [ ] accepted environment/material/spatial behaviors justified by source;
- [ ] shared Scene V3 exact-frame state;
- [ ] multiple meaningful non-camera contributions;
- [ ] source/runtime receipts;
- [ ] normal-speed human A/B improvement.

Rive is not required. Failed Shot 3 water/rigging masks are not required to be resurrected.

## Phase 8+ — physics, crowds, herds, cities, montage

Status: **NOT STARTED**

These phases retain their original goals, but every future runtime also inherits the automation doctrine: a package that creates recurring GUI authoring for default production must prove exceptional reuse/value or be deferred.

## Universal phase-stop conditions

Stop and diagnose when:

```text
runtime ownership becomes ambiguous
same exact frame becomes nondeterministic
source/candidate hashes drift
local and CI semantics diverge
license/model rights are unresolved
manual GUI work becomes recurring production dependency
identity/source fidelity repeatedly fails
technical green output is human-rejected
semantic locator passes disagree materially
semantic geometry violates visible source anatomy
thresholds are weakened merely to obtain a pass
```

A clean rejection is progress. The system should convert failures into evidence and fallback, not a manual repair queue.

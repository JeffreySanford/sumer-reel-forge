# Animation V3 Implementation Backlog and Phase Gates

Status: **active execution plan**

Updated: **2026-08-26**

This checklist reflects repository evidence, not aspiration. The production character path is governed by [`automation-first-character-performance.md`](./automation-first-character-performance.md).

Legend:

```text
[x] implemented and verified at intended scope
[~] partial / foundation exists
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

- [ ] reusable source-backed material/deformation primitive on a source that actually supports it;
- [ ] fixed-frame visual regression for an accepted source-backed benchmark;
- [ ] broader material proof only where source decomposition is trustworthy.

Phase exit is **not** achieved merely by increasing motion-channel count.

## Phase 5 — Automated actor preparation/performance

Status: **STARTED — ACTIVE NEXT PHASE**

### 5.0 Rive boundary experiment

- [x] `libs/animation-rive` neutral contract foundation;
- [x] no-autoplay/no-autonomous-clock tests;
- [x] byte-identical Enki neutral prep and SHA receipt;
- [x] candidate handoff safety checker;
- [!] Rive runtime install deferred;
- [!] manual `.riv` authoring rejected as production critical path.

The Rive work remains evidence/optional adapter scaffolding; it is not deleted and is not the default pipeline.

### 5.1 Actor-prep contracts

- [ ] add engine-neutral `ActorPrepDefinition` and evidence types;
- [ ] represent semantic regions, landmarks and contact anchors;
- [ ] represent preparation/backend/license states;
- [ ] ensure actor prep does not introduce a timeline authority;
- [ ] add contract/unit validation.

### 5.2 Automated Enki prep

- [ ] discover latest accepted recovered Enki source receipt;
- [ ] SHA/dimension verification;
- [ ] create candidate-only actor-prep workspace under `tmp/`;
- [ ] record desired semantic regions/anchors;
- [ ] record backend candidates and blockers;
- [ ] zero per-shot/manual-editor dependency;
- [ ] deterministic repeat/receipt proof.

### 5.3 Automated semantic discovery

- [ ] head/face/torso/arm/hand region discovery from source;
- [ ] landmark/anchor proposal with confidence;
- [ ] source-pixel fidelity checks;
- [ ] reject unsupported/contaminated regions instead of manual cleanup;
- [ ] human review only for candidate acceptance.

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
thresholds are weakened merely to obtain a pass
```

A clean rejection is progress. The system should convert failures into evidence and fallback, not a manual repair queue.

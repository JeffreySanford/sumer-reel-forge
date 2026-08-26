# Studio Information Architecture and Authoring Workflow

Status: **active architecture contract — Angular Studio + React Animation Lab roles now implemented at foundation level**

Updated: **2026-08-26**

This document defines how Studio should expose Scene V3, provenance, assets, runtimes, proofs and promotion without becoming an engine-specific control panel. It also records the now-explicit division of responsibility between the Angular Studio and the React Animation Lab.

## 1. Studio role

The primary product Studio is the Angular application at `apps/web`.

Studio is the orchestration and review surface for:

- narrative/source context;
- Scene V3 authoring data;
- asset selection;
- runtime configuration at declared boundaries;
- proof invocation/results;
- QA diagnostics;
- human review;
- explicit promotion;
- project/chapter/reel/shot workflow;
- eventually typed server-side execution of approved scripts/workflows.

Studio does not directly own Rive, Pixi, Three, Rapier or Spine state. It edits validated Scene V3/runtime configuration and displays resolved runtime diagnostics.

The Angular Studio remains the application that operates Sumer Reel Forge. The React Animation Lab is a specialist companion tool, not a replacement UI.

## 2. Dual-surface application architecture

### Angular Studio — `apps/web`

Primary responsibilities:

```text
project navigation
chapter/reel/shot workflow
manuscript/source context
asset/candidate management
render/generation job control
QA/review/promotion
production status
safe workflow invocation through API methods
```

### React Animation Lab — `apps/animation-lab`

Primary responsibilities:

```text
exact-frame Scene V3 inspection
runtime adapter engineering
Storybook benchmark states
Pixi/Rive/Three/Rapier proofs
local/composed transform diagnostics
runtime capabilities
visual/evidence diagnostics
engine-specific debugging behind neutral contracts
```

### Shared rule

Neither UI becomes semantic authority.

```text
Angular Studio                 React Animation Lab
      │                                │
      └──────────────┬─────────────────┘
                     ↓
          Scene V3 / resolved state
                     ↓
       compiler / frame / runtime / QA
                     ↓
              render infrastructure
```

The Lab may prove a runtime capability first. Once accepted, the normal production control should surface in Angular through an engine-neutral Scene V3/API contract.

## 3. Local workstation URLs

The intended persistent local workstation is:

```text
Angular Studio   http://localhost:4200
Animation Lab    http://localhost:4300
API              http://localhost:3000/api
API docs         http://localhost:3000/api/docs
```

`pnpm start:all` manages these dev services in the current foundation branch, allowing the workstation to remain running while tests/render/scripts/Git work occur in another terminal.

## 4. Primary information architecture

```text
Project
  ├─ Chapters
  │   └─ Reels / scenes / shots
  ├─ Narrative & Sources
  ├─ Assets
  ├─ Actors / Rigs
  ├─ Materials
  ├─ Worlds / Cities
  ├─ Simulations
  ├─ Benchmarks
  └─ Evidence / Promotions
```

The Animation Lab is reached from a relevant scene/shot/benchmark rather than becoming a competing project browser.

## 5. Scene workspace layout

Recommended desktop layout:

```text
┌───────────────────────────────────────────────────────────────┐
│ Scene header: ID | revision | L1/L2/L3 | status | source     │
├──────────────┬──────────────────────────────┬─────────────────┤
│ hierarchy /  │                              │ inspector       │
│ timeline     │       visual preview         │ tabs            │
│              │                              │                 │
│ actors       │                              │ properties      │
│ materials    │                              │ provenance      │
│ effects      │                              │ QA              │
│ events       │                              │ diagnostics     │
├──────────────┴──────────────────────────────┴─────────────────┤
│ proof states | exact frame | playback | evidence | status    │
└───────────────────────────────────────────────────────────────┘
```

Responsive/zoom behavior must preserve inspectability rather than shrink everything into unreadable panels.

## 6. Scene header

Always visible:

```text
scene ID
chapter/reel/shot
scene revision
schema version
resolved/current/stale state
Level 1/2/3 target
local proof status
CI status when known
human approval status
```

Do not conflate `rendered` with `approved`.

## 7. Hierarchy panel

Logical hierarchy, not DOM/Three/Pixi scene graph internals:

```text
Camera
Environment
Actors
Props
Materials
Effects
Crowds
Simulations
World states
Montage
```

Selecting a node opens the appropriate inspector.

## 8. Timeline panel

Canonical coordinate is frame.

Features:

- integer frame ruler;
- fps display;
- clip/frame ranges;
- named proof-state markers;
- performance tracks;
- material/effect tracks;
- camera tracks;
- events;
- simulation bake markers;
- narration/caption track later.

No engine-specific wall-clock timeline.

## 9. Exact-frame control

Central control shared semantically with Animation Lab.

Keyboard requirements:

```text
Left/Right: ±1 frame
Shift+Left/Right: planned larger step
Home/End: scene bounds
proof-state shortcuts/buttons
```

Current frame, seconds and proof-state name are visible.

Unit, Storybook and E2E tests share frame fixture semantics.

The Lab already proves this model through its current exact-frame harness; Angular should reuse the semantic contract rather than reimplement time math.

## 10. Preview modes

```text
SOURCE
L1_BASELINE
L2
L3
AB_COMPARE
DEBUG
QA_OVERLAY
```

`DEBUG` must be visually obvious and impossible to confuse with production preview.

The current Animation Lab Pixi canvas is a foundation/debug runtime surface, not final production output.

## 11. Inspector tabs

### Properties

Scene/runtime-neutral authoring values.

### Provenance

Manuscript/source/evidence as defined in Phase 1 provenance UX.

### QA

Gate list, metrics, blocking status, proof state.

### Diagnostics

Resolved asset/runtime/seed/frame trace.

### Evidence

Receipts and proof artifacts.

These tab concepts already exist in the Animation Lab inspection shell and should inform Angular without forcing identical component implementations.

## 12. Actor inspector

Shows:

```text
actor ID
rig ID/revision
runtime
source hash
maturity
performance tracks
contact targets
spatial transform
QA requirements
```

Rive-specific implementation details may appear in an advanced runtime subpanel, but Scene V3 semantic controls remain primary.

## 13. Material inspector

Shows:

```text
material ID
runtime
source texture/mesh
parameters
driver channels
bounds
safe zones
proof states
```

Pixi-specific object details belong in diagnostics, not in canonical material identity.

## 14. World/City inspector

Shows:

```text
city/world definition
state/development phase
terrain/water
architecture palette
population
industry/agriculture
historical/visual evidence
LOD/runtime budget
```

## 15. Simulation inspector

Shows:

```text
simulation definition ID
engine/version
fixed timestep
seed
construction hash
bake status
bake hash
frame count
proof status
```

Authoring simulation and playback bake are visibly distinct.

## 16. QA dashboard

Status categories:

```text
PASS
BLOCKED
REVIEW_REQUIRED
STALE
NOT_RUN
N/A
```

Grouped by:

- schema/source;
- asset integrity;
- runtime;
- deterministic behavior;
- visual structural;
- semantic;
- performance;
- accessibility/motion safety;
- human.

The Lab already preserves `NOT_RUN` rather than presenting unseen QA as passing. Angular must preserve the same principle.

## 17. Benchmark dashboard

Each platform benchmark shows:

```text
implementation status
local quality
CI quality
render proof
semantic review
human approval
runtime versions
last proof receipt
```

This becomes the platform readiness board.

A benchmark may link directly to its Animation Lab scene/proof state.

## 18. Asset browser

Filter by:

```text
asset class
actor/world
maturity
lifecycle
runtime owner
canonical/candidate/debug
source/provenance
staleness
```

Debug/proof artifacts hidden by default in production asset selection.

## 19. Candidate review mode

Dedicated review view should show:

```text
source
candidate
A/B or proof states
normal-speed preview
QA metrics
semantic verdict
provenance impact
approve / reject / request revision
```

No editing candidate pixels here; revision produces new candidate.

## 20. Promotion mode

Promotion view displays exact target:

```text
candidate hash
canonical target ID/revision
old hash
new hash
scene/source/runtime staleness
QA receipt
human review receipt
```

Confirmation is explicit and keyboard accessible.

No Lab preview, green unit suite or successful generation may substitute for human promotion evidence when the workflow requires human review.

## 21. Error/diagnostic mode

When render fails, Studio should classify failure:

```text
scene compilation
source resolution
asset resolution
runtime prepare
runtime evaluate
Remotion render
proof extraction
semantic review
promotion
```

Show one coherent diagnostic bundle, not unrelated console snippets.

Animation Lab runtime errors should eventually be linkable from Studio diagnostics using scene/runtime/frame identity.

## 22. Unsaved/edit state

Studio authored changes must distinguish:

```text
SAVED_AUTHORING
DIRTY_AUTHORING
RESOLVED_CURRENT
RESOLVED_STALE
PROOF_CURRENT
PROOF_STALE
```

Changing an authoring field marks resolved/proof data stale until recomputed.

## 23. Authoring workflow

```text
open scene
  ↓
inspect source/provenance
  ↓
edit Scene V3 authoring data
  ↓
local validate/compile
  ↓
inspect exact proof states
  ↓
open Animation Lab when runtime-level inspection is needed
  ↓
run affected QA
  ↓
render short proof if visual
  ↓
human review
  ↓
promote if accepted
```

## 24. Scene creation workflow

New scene wizard should eventually require:

- story/chapter/reel/shot identity;
- target level;
- source/editorial asset;
- narrative/source binding;
- duration/fps/resolution;
- initial runtime needs.

It should not begin by asking which npm animation library to use.

## 25. Runtime selection UX

Runtime ownership is usually inferred from asset/definition class.

Advanced selection may exist for evaluated alternatives, but the UI should not encourage switching hero actors between Rive/Spine casually after proof binding.

Pixi/Rive/Three package names are diagnostic implementation details, not the primary creative vocabulary.

## 26. Studio → Animation Lab navigation

Near-term planned Studio action:

```text
Open Animation Lab
```

The handoff should pass semantic identity, for example:

```text
scene ID
scene revision
resolved hash when known
frame or proof-state ID
selected node/runtime ID when useful
```

A possible future local URL shape:

```text
http://localhost:4300/scene/scene:ch01:r01:s03:foundation?revision=1&frame=101
```

The Lab should resolve authoritative data through shared/API state rather than trusting arbitrary query-string runtime data.

## 27. Animation Lab → Studio navigation

The Lab should provide a route back to the owning project/scene/shot in Angular Studio.

This prevents the Lab from becoming a disconnected alternative project-management application.

## 28. Current data-loading limitation

The Lab currently uses a pinned reduced golden fixture for browser/runtime proof.

That is appropriate for deterministic tests but not sufficient for normal production use.

Planned transition:

```text
golden fixture remains for tests
        +
Lab can select/fetch resolved scene by semantic identity
        +
hash/revision validation prevents stale inspection
```

This removes the need to manually maintain copied semantic fields for ordinary use while retaining deterministic golden coverage.

## 29. Storybook plan for Studio

Major story groups:

```text
Studio/SceneHeader
Studio/Timeline
Studio/FrameControl
Studio/Hierarchy
Studio/Inspector/Actor
Studio/Inspector/Material
Studio/Inspector/World
Studio/Inspector/Simulation
Studio/QA
Studio/Diagnostics
Studio/CandidateReview
Studio/Promotion
Studio/BenchmarkDashboard
```

Every state includes loading, empty, error, blocked and stale where relevant.

The React Lab retains its separate Storybook suite for runtime engineering proof states.

## 30. Unit tests

- view-model derivation;
- frame controls;
- status aggregation;
- stale-state transitions;
- runtime ownership labels;
- candidate/promotion eligibility;
- keyboard command mapping;
- warning presentation;
- no debug asset in production selector.

## 31. Storybook interaction tests

- scrub frame;
- select proof state;
- switch preview mode;
- navigate inspector tabs;
- expand provenance;
- inspect QA failure;
- review candidate;
- open promotion confirmation;
- reduced-motion preview remains paused.

## 32. E2E workflows

### E2E-STUDIO-001 scene inspection

Load scene, inspect provenance, actor, material and diagnostics.

### E2E-STUDIO-002 exact-frame proof

Select named proof state and verify frame/preview state consistent.

### E2E-STUDIO-003 stale authoring

Edit Scene V3 property and verify prior proof becomes stale.

### E2E-STUDIO-004 candidate review

Review, reject, reload and verify canonical unchanged.

### E2E-STUDIO-005 promotion

Approve/promote fixture, reload, verify exact canonical revision.

### E2E-STUDIO-006 keyboard-only core review

Complete source inspection, frame navigation, QA inspection and review action without pointer.

### E2E-STUDIO-007 reduced motion

Emulate reduced motion; verify autoplay/UI transitions follow policy.

### E2E-STUDIO-008 open Animation Lab

From a selected scene/shot, open the Lab and verify semantic scene/revision/frame identity matches.

### E2E-STUDIO-009 workflow job

Submit one safe typed workflow job, observe status/logs, and verify output identity without giving the browser arbitrary shell access.

## 33. Accessibility requirements

- semantic regions/headings;
- accessible frame slider/control;
- keyboard timeline alternatives;
- focus visible;
- no color-only state;
- status updates sensible for screen reader;
- panels operable at zoom;
- dialogs return focus;
- large visual canvas has textual state/diagnostic alternative.

The current Animation Lab intentionally pairs its Pixi canvas with textual transform/runtime/evidence diagnostics; this pattern should continue for inaccessible visual surfaces.

## 34. Local-first gate

Any Angular Studio feature slice:

```text
Angular unit
lint
build
Storybook build/interactions/a11y
applicable Playwright E2E
```

Any Animation Lab runtime slice:

```text
adapter/foundation unit
Animation Lab unit
lint/build
Storybook build
browser E2E
applicable V3 integration
```

Then GitHub Actions repeat deterministic checks when capacity is available. Local deterministic evidence remains the immediate development authority; known failures are never merged merely because CI is unavailable.

## 35. UI-driven execution of scripts/workflows

The long-term goal is to make common repository operations available from Angular Studio, but through typed methods/jobs rather than arbitrary shell commands.

### Do not implement

```text
POST /shell
{ command: "pnpm whatever" }
```

That would weaken security, reproducibility, input validation, quoting, auditability and promotion safety.

### Preferred model

```text
Angular action
    ↓
typed API method/job request
    ↓
allowlisted server-side workflow service
    ↓
reusable domain function or existing CLI wrapper
    ↓
persisted job/output/evidence state
    ↓
structured status stream to Angular
```

### Candidate typed operations

```text
prepareShotAssets(shotId)
generateCandidate(shotId, layerId, workflowId)
verifyCandidate(candidateId)
renderProof(sceneId, revision, profile)
runMaterialQa(proofId)
compileSceneV3(sceneId, revision)
renderNamedProofState(sceneId, proofStateId)
createPromotionPlan(candidateId)
promoteReviewedCandidate(reviewReceiptId)
```

Initially, services may call the existing scripts. The architectural direction should be to move reusable logic into shared TypeScript services so CLI and API become two entrypoints into the same implementation.

## 36. Job execution contract

Future Studio jobs should carry:

```text
job ID
operation type
validated semantic inputs
scene/shot/candidate IDs
requested runtime/profile
status/progress
structured log/events
output artifact IDs/hashes
QA receipt links
cancelability
retryability
human-review requirement
```

Operational timestamps may exist for observability but must not become animation semantic inputs.

## 37. Promotion execution is stronger than ordinary jobs

A promotion method must verify:

- exact candidate hash;
- expected current canonical revision;
- required QA receipts;
- required human review receipt;
- staleness state;
- transactional target update;
- rollback/supersession metadata.

No background render/generation completion may implicitly promote output.

## 38. Current implementation checkpoint

As of 2026-08-26:

Implemented foundation:

- Angular Studio remains active on 4200;
- React Animation Lab exists and is moving to stable 4300 workstation service;
- Scene V3 compiler/runtime/inspection foundation exists;
- Lab exact-frame/fake-runtime diagnostics exist;
- isolated Pixi exact-frame WebGL surface exists;
- three-browser Pixi E2E is green before the 4300 startup update;
- production Scene V2/Remotion remains authoritative for Reel 1.

Still missing from the intended Studio architecture:

- dynamic resolved Scene V3 loading in the Lab;
- Studio ↔ Lab semantic deep links;
- production source-backed Pixi material proof;
- Rive/Three runtime proofs;
- typed workflow API/job layer for many CLI operations;
- complete V3 production migration;
- full production provenance/QA/promotion UI.

See [`current-implementation-status-and-roadmap.md`](./current-implementation-status-and-roadmap.md) and [`implementation-backlog.md`](./implementation-backlog.md) for the current execution order.

## 39. Definition of successful Studio architecture

Studio is successful if a reviewer can understand and control a complex Scene V3 without knowing which engine-specific object graph produced it, while still being able to drill into Animation Lab/runtime diagnostics when something fails.

The overall product should feel like one system:

> Angular Studio operates the work. Animation Lab explains and proves the animation machinery. Scene V3 and the shared runtime/compiler contracts keep both honest.

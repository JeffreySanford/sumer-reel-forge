# Studio Information Architecture and Authoring Workflow

Status: **planning contract**

This document defines how Studio should expose Scene V3, provenance, assets, runtimes, proofs and promotion without becoming an engine-specific control panel.

## 1. Studio role

Studio is the orchestration and review surface for:

- narrative/source context;
- Scene V3 authoring data;
- asset selection;
- runtime configuration at declared boundaries;
- exact-frame inspection;
- proof invocation/results;
- QA diagnostics;
- human review;
- explicit promotion.

Studio does not directly own Rive, Pixi, Three, Rapier or Spine state. It edits validated Scene V3/runtime configuration and displays resolved runtime diagnostics.

## 2. Primary information architecture

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

## 3. Scene workspace layout

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

## 4. Scene header

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

## 5. Hierarchy panel

Logical hierarchy, not DOM/Three scene graph internals:

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

## 6. Timeline panel

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

## 7. Exact-frame control

Central control shared with Animation Lab.

Keyboard requirements:

```text
Left/Right: ±1 frame
Shift+Left/Right: planned larger step
Home/End: scene bounds
proof-state shortcuts/buttons
```

Current frame, seconds and proof-state name are visible.

Unit, Storybook and E2E tests share frame fixture semantics.

## 8. Preview modes

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

## 9. Inspector tabs

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

## 10. Actor inspector

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

## 11. Material inspector

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

## 12. World/City inspector

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

## 13. Simulation inspector

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

## 14. QA dashboard

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

## 15. Benchmark dashboard

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

## 16. Asset browser

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

## 17. Candidate review mode

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

## 18. Promotion mode

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

## 19. Error/diagnostic mode

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

## 20. Unsaved/edit state

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

## 21. Authoring workflow

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
run affected QA
  ↓
render short proof if visual
  ↓
human review
  ↓
promote if accepted
```

## 22. Scene creation workflow

New scene wizard should eventually require:

- story/chapter/reel/shot identity;
- target level;
- source/editorial asset;
- narrative/source binding;
- duration/fps/resolution;
- initial runtime needs.

It should not begin by asking which npm animation library to use.

## 23. Runtime selection UX

Runtime ownership is usually inferred from asset/definition class.

Advanced selection may exist for evaluated alternatives, but the UI should not encourage switching hero actors between Rive/Spine casually after proof binding.

## 24. Storybook plan for Studio

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

## 25. Unit tests

- view-model derivation;
- frame controls;
- status aggregation;
- stale-state transitions;
- runtime ownership labels;
- candidate/promotion eligibility;
- keyboard command mapping;
- warning presentation;
- no debug asset in production selector.

## 26. Storybook interaction tests

- scrub frame;
- select proof state;
- switch preview mode;
- navigate inspector tabs;
- expand provenance;
- inspect QA failure;
- review candidate;
- open promotion confirmation;
- reduced-motion preview remains paused.

## 27. E2E workflows

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

## 28. Accessibility requirements

- semantic regions/headings;
- accessible frame slider/control;
- keyboard timeline alternatives;
- focus visible;
- no color-only state;
- status updates sensible for screen reader;
- panels operable at zoom;
- dialogs return focus;
- large visual canvas has textual state/diagnostic alternative.

## 29. Local-first gate

Any Studio feature slice:

```text
Angular unit
lint
build
Storybook build/interactions/a11y
applicable Playwright E2E
```

Then GitHub Actions repeats deterministic checks.

## 30. Definition of successful Studio architecture

Studio is successful if a reviewer can understand and control a complex Scene V3 without knowing which engine-specific object graph produced it, while still being able to drill into runtime diagnostics when something fails.

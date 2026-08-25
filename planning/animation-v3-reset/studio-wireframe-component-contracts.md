# Studio Wireframe and Component Contracts

Status: **planning contract**

This document converts the Studio information architecture into testable component contracts and textual wireframes. It intentionally avoids styling decisions; the goal is to define information, state, keyboard behavior, Storybook coverage and E2E seams before UI implementation.

## 1. Scene workspace wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ CH01 / Reel 01 / Shot 03   Scene V3 rev 1   L2→L3   CURRENT   LOCAL GREEN │
│ Narrative: Enki Voyage      Source: 2 literary / 1 visual     Human: NONE  │
├───────────────┬──────────────────────────────────────┬───────────────────────┤
│ HIERARCHY     │ PREVIEW                              │ INSPECTOR             │
│ Camera        │                                      │ Properties            │
│ Environment   │     exact rendered/current frame     │ Provenance            │
│ Actors        │                                      │ QA                    │
│  └ Enki       │                                      │ Diagnostics           │
│ Props         │                                      │ Evidence              │
│ Materials     │                                      │                       │
│ Effects       │                                      │                       │
├───────────────┴──────────────────────────────────────┴───────────────────────┤
│ TIMELINE frame 101 / 210   [OPEN][CLOSING][CLOSED][OPENING][RETURNED]      │
│ performance | materials | camera | simulation | audio/captions             │
├──────────────────────────────────────────────────────────────────────────────┤
│ MODE: SOURCE | L1 | L2 | L3 | A/B | QA | DEBUG     Proof: CURRENT/STALE   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 2. Component boundary principle

UI components consume view models/typed contracts, not raw runtime objects.

Example:

```ts
interface ActorInspectorViewModel {
  actorId: string;
  displayName: string;
  runtimeLabel: string;
  rig: VersionedAssetSummary;
  sourceStatus: SourceStatus;
  performanceTracks: PerformanceTrackSummary[];
  qaStatus: GateSummary;
  staleness: StalenessSummary;
}
```

The Angular component should not know how a Rive artboard stores inputs.

## 3. SceneHeaderComponent

Displays:

- chapter/reel/shot identity;
- Scene V3 revision/schema;
- target animation level;
- authoring/resolved/proof staleness;
- local/CI quality state;
- human approval state;
- source coverage count.

Storybook states:

```text
CurrentGreen
DirtyAuthoring
ProofStale
QABlocked
CIGreenHumanPending
Promoted
```

Unit tests:

- status priority aggregation;
- stale state not hidden by CI green;
- `rendered` does not imply `approved`.

## 4. ExactFrameControlComponent

Inputs:

```text
frame
fps
durationFrames
proofStates
reducedMotion
playbackAllowed
```

Outputs:

```text
frameChange
proofStateSelected
playRequested
pauseRequested
```

Keyboard contract:

- Left/Right: one frame;
- PageUp/PageDown: configured jump;
- Home/End: bounds;
- proof-state buttons keyboard reachable;
- playback not required for any inspection operation.

Storybook interaction tests cover all keyboard paths.

## 5. PreviewViewportComponent

Modes:

```text
SOURCE
L1_BASELINE
L2
L3
AB_COMPARE
QA_OVERLAY
DEBUG
```

Requirements:

- exact frame is explicit;
- mode visibly labeled;
- DEBUG has persistent visual boundary/banner;
- reduced-motion defaults preview paused;
- loading/error/unavailable runtime states are not blank canvas.

No promotion action exists inside viewport itself.

## 6. HierarchyTreeComponent

Semantic nodes only:

```text
Camera
Environment
Actors
Props
Materials
Effects
Crowds
Herds
Simulations
World states
Montage
```

Keyboard:

- arrow tree navigation;
- Enter/select;
- focus state visible;
- expand/collapse announced.

Runtime-internal child objects appear only in optional diagnostics subtree.

## 7. InspectorShellComponent

Tabs:

```text
Properties
Provenance
QA
Diagnostics
Evidence
```

Tab state must be URL/deep-link compatible eventually so a failing gate can open directly from diagnostics/report.

## 8. ProvenanceCardComponent

Shows:

- manuscript/thread;
- source type/title/locator;
- adaptation class;
- confidence;
- evidence relationship;
- warnings/staleness;
- external source navigation where allowed.

No badge such as `HISTORICALLY ACCURATE` exists. The vocabulary stays specific.

Storybook states:

```text
ETCSLDirect
ETCSLCloseParaphrase
Composite
FictionalBridge
NonETCSLLiterary
VisualDirect
VisualContextual
VisualSpeculative
PeriodWarning
StaleRecord
MissingOptionalSource
```

## 9. QaGateListComponent

Each gate row:

```text
icon + textual status
gate name
version
input/evidence summary
metrics if useful
reason
navigate-to-proof
```

Status is never color-only.

Filters:

```text
BLOCKING
REVIEW_REQUIRED
PASS
STALE
NOT_RUN
```

## 10. RuntimeDiagnosticsComponent

Displays the trace chain:

```text
semantic ID
runtime
runtime version
adapter version
logical asset
canonical hash
staged hash
resolved path/ID
frame
seed
prepared-state ID/cache key
```

Advanced data may be collapsible but must be copyable as a compact diagnostic bundle.

## 11. CandidateReviewComponent

Three-column conceptual layout:

```text
SOURCE/BASELINE | CANDIDATE | EVIDENCE/QA
```

Controls:

```text
normal speed
proof frames
A/B
reject
request revision
approve
```

Approval requires viewing required proof artifacts or explicitly acknowledging missing optional evidence according to contract.

## 12. PromotionDialogComponent

Must display:

```text
candidate ID/hash
old canonical revision/hash
new target revision
QA status
human approval status
staleness
source/scene/runtime versions
supersedes relation
```

Confirmation text names the exact logical asset/scene.

Accessibility:

- focus trap;
- Escape/cancel;
- destructive/consequential wording clear;
- focus returns to review surface;
- success/failure announced.

## 13. BenchmarkDashboardComponent

Rows:

```text
benchmark fixture
capability
runtime(s)
unit
storybook
visual
motion proof
semantic
E2E
human
performance
status
```

This dashboard should answer “why are we not returning to Reel 1 yet?” from repository state rather than chat memory.

## 14. CityInspectorComponent

Displays:

```text
city ID/revision
development state
geography/water
architecture palette
industries
population/herds
regions/paths
visual evidence confidence
LOD/performance profile
```

World definition edits and scene-instance edits are visibly different operations.

## 15. TimelineTrackComponent

Track classes:

```text
PERFORMANCE
MATERIAL
CAMERA
EFFECT
SIMULATION
WORLD_STATE
MONTAGE
AUDIO
CAPTION
```

Initial implementation can be read-only/limited authoring. Do not build a full NLE before Scene V3 foundation proves value.

## 16. StalenessBannerComponent

Reasons should be explicit:

```text
NARRATIVE_STALE
SOURCE_STALE
ASSET_STALE
RUNTIME_STALE
SIMULATION_STALE
PROOF_STALE
HUMAN_REVIEW_STALE
```

Banner provides next recommended action; it does not automatically regenerate or promote anything.

## 17. ErrorBoundary/FailurePanel

Failure classes:

```text
SCENE_VALIDATION
SOURCE_RESOLUTION
ASSET_RESOLUTION
RUNTIME_PREPARE
RUNTIME_EVALUATE
RENDER
PROOF_EXTRACTION
SEMANTIC_REVIEW
PROMOTION
ENVIRONMENT
```

Show compact error plus expandable trace. Never replace semantic failure with a generic `Something went wrong` only.

## 18. Storybook organization

```text
Studio/Scene/Header
Studio/Scene/FrameControl
Studio/Scene/Preview
Studio/Scene/Hierarchy
Studio/Inspector/Provenance
Studio/Inspector/Actor
Studio/Inspector/City
Studio/QA/GateList
Studio/Diagnostics/RuntimeTrace
Studio/Review/Candidate
Studio/Review/Promotion
Studio/Benchmarks/Dashboard
Studio/States/Staleness
Studio/States/Failure
```

Every component has default, loading, empty, blocked, stale, error and reduced-motion states where meaningful.

## 19. Storybook a11y/interaction minimum

For interactive components:

- keyboard operation;
- visible focus;
- semantic accessible name;
- no color-only status;
- dialog focus behavior;
- frame value announcement;
- reduced-motion state;
- 200% zoom/reflow smoke where practical.

## 20. Angular unit test minimum

Components test view-model/state logic, not pixel appearance:

- status aggregation;
- event output;
- keyboard commands;
- staleness mapping;
- disabled promotion logic;
- text labels/status semantics;
- source warning display;
- route/deep-link state.

## 21. E2E component-to-workflow mapping

```text
SceneHeader        → load/revision/stale workflow
FrameControl       → exact proof-state navigation
ProvenanceCard     → source inspection
QaGateList         → blocked proof diagnosis
Diagnostics        → source→staged→resolved trace
CandidateReview    → reject/approve workflow
PromotionDialog    → promotion + stale block + rollback
BenchmarkDashboard → platform readiness inspection
CityInspector      → city state + evidence workflow
```

## 22. Test IDs

Prefer accessible-role queries. Stable `data-testid` values only where canvas/complex visual state cannot be queried semantically.

Do not litter component API with test-only implementation details.

## 23. Local-first UI gate

For a Studio slice:

```text
Angular unit
lint
build
Storybook build
Storybook interaction/a11y
affected Playwright E2E
```

Run locally before push. GitHub Actions repeats deterministic browser/UI checks.

## 24. Deferred UI scope

Do not implement initially:

- unrestricted node graph editor;
- full nonlinear video editor;
- direct Rive editor replacement;
- direct Three scene editor replacement;
- arbitrary scripting console;
- automatic AI prompt generation as default workflow.

Studio orchestrates approved specialized tools; it does not need to recreate all of them.

## 25. Definition of wireframe readiness

A component is ready to implement when its inputs, outputs, semantic state, keyboard behavior, Storybook states, unit obligations and E2E role are specified enough that implementation choices concern UI engineering—not rediscovering product behavior.

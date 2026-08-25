# Storybook Benchmark Control Matrix

Status: **browser-proof contract / implementation planning**

Storybook is the shared inspection surface for deterministic proof states, controls, accessibility and visual comparison. It is not a second animation timeline and must not reimplement scene logic separately from Remotion.

## 1. Core rule

```text
Benchmark fixture owns proof state and control semantics
FrameContext owns exact frame
Runtime adapters evaluate the same fixture
Storybook displays/controls it
Remotion renders it
Playwright drives the same public controls
```

If Storybook needs different frame math or hidden mock motion to make a benchmark look right, the architecture has failed.

## 2. Standard story inventory

Every production benchmark exposes, where applicable:

```text
Overview
Identity/Source
START
ANTICIPATION
PEAK
SETTLE
END
NormalSpeed
Controls
Debug
NegativeControl
Stress
Evidence
ReducedMotion
```

Not every benchmark needs every semantic label, but missing required categories must be explicit `N/A`.

## 3. Shared control vocabulary

Global controls:

```text
frame
playing
playbackRate
proofState
renderMode
showDebug
showEvidence
reducedMotion
```

Common contribution controls:

```text
CAMERA_FROZEN
CHARACTER_FROZEN
MATERIAL_FROZEN
VESSEL_FROZEN
PHYSICS_FROZEN
CROWD_FROZEN
WORLD_STATE_FROZEN
```

Benchmark-specific controls extend this vocabulary; they do not redefine global semantics.

## 4. Control ownership

A Storybook control writes benchmark/preview input only.

It must not:

- mutate canonical scene data;
- write promoted assets;
- alter a production receipt;
- use wall-clock state for deterministic proof;
- bypass runtime capability checks;
- silently substitute a missing asset.

## 5. Enki Facial matrix

Fixture:

```text
benchmark:enki-facial:v1
```

Proof states:

```text
OPEN
CLOSING
CLOSED
OPENING
RETURNED_OPEN
GAZE_LEFT
GAZE_CENTER
BREATH_PEAK
```

Controls:

```text
BLINK_DISABLED
GAZE_DISABLED
BREATH_DISABLED
SHOW_MESH
SHOW_LANDMARKS
```

Required story IDs/test mappings:

```text
STORY-RIVE-001 enki-neutral
STORY-RIVE-002 enki-open
STORY-RIVE-003 enki-closed
VISUAL-ENKI-002 blink-closed
MOTION-ENKI-001 natural-blink
FAILURE-ENKI-001 open-at-closed-frame
FAILURE-ENKI-002 cyan-eye-debug-leak
```

## 6. Enki Helm matrix

Fixture:

```text
benchmark:enki-helm:v1
```

Proof states:

```text
START
BREATH_VISIBLE
BLINK_CLOSING
BLINK_CLOSED
BLINK_RETURNED
HELM_GESTURE_PEAK
RIGGING_LAG_PEAK
END_SETTLED
```

Controls:

```text
BASELINE_V2
CHARACTER_FROZEN
MATERIAL_FROZEN
VESSEL_FROZEN
CAMERA_FROZEN
BLINK_DISABLED
RIGGING_DISABLED
SHOW_CONTACT_ANCHORS
```

Required assertions:

- selecting `BLINK_CLOSED` resolves the exact fixture frame;
- toggling `CHARACTER_FROZEN` does not freeze vessel/water;
- toggling `CAMERA_FROZEN` does not suppress vessel motion;
- contact overlay uses semantic Enki/Stag anchors;
- no control changes the source scene revision.

## 7. Stag Spatial matrix

Fixture:

```text
benchmark:stag-spatial:v1
```

Proof states:

```text
START
DEPTH_ESTABLISHED
CAMERA_NEAR
PARALLAX_PEAK
EDGE_RISK_FRAME
END
```

Controls:

```text
CAMERA_FROZEN
DEPTH_FLATTENED
SHOW_CARDS
SHOW_BOUNDS
SHOW_UNPAINTED_RISK
WATER_FROZEN
```

Negative story deliberately chooses a camera state that would reveal unsupported card edges and must be rejected by proof/QA.

## 8. Kutu Storm matrix

Fixture:

```text
benchmark:kutu-storm:v1
```

Proof states:

```text
CALM_ENTRY
STORM_BUILD
HAIL_ONSET
IMPACT_PEAK
MAX_ROLL
STORM_BREAK
CALM_RETURN
```

Controls:

```text
NO_HAIL
VESSEL_FIXED
PHYSICS_FROZEN
NO_FOAM
NO_SPRAY
SHOW_COLLIDERS
SHOW_TRAJECTORIES
SAME_SEED
ALTERNATE_SEED
```

`SHOW_COLLIDERS` is debug-only and production-ineligible.

## 9. Igigi Crew matrix

Fixture:

```text
benchmark:igigi-crew:v1
```

Proof states:

```text
ONE_WORKER
FIVE_WORKERS
TWENTY_WORKERS
HUNDRED_WORKERS
PHASE_VARIATION
REST_CYCLE
```

Controls:

```text
agentCount
seedVariant
SHOW_PATHS
SHOW_ROLE_IDS
FORCE_SYNCHRONIZED_NEGATIVE
CROWD_FROZEN
```

The synchronized negative control must visibly/semantically fail clone-variation acceptance.

## 10. Eridu City Growth matrix

Fixture:

```text
benchmark:city-growth:v1
```

Proof states:

```text
BARREN
EARLY_SETTLEMENT
CANALIZED
TEMPLE_CENTER
MATURE_PORT
```

Controls:

```text
worldState
SHOW_REGIONS
SHOW_PATHS
SHOW_EVIDENCE_CONFIDENCE
SHOW_SPECULATIVE_FEATURES
CROWD_FROZEN
VEGETATION_FROZEN
```

Switching state must not replace the city with unrelated random imagery.

## 11. Evidence panel contract

Every benchmark involving historical visual reconstruction exposes:

```text
source/evidence IDs
application relationship
confidence
rights mode
allowed claim summary
prohibited claim summary
staleness status
```

Evidence panel is read-only in benchmark stories unless the story is specifically a Studio authoring workflow.

## 12. Debug mode contract

Debug mode may show:

```text
landmarks
bones
meshes
card bounds
colliders
paths
seed values
runtime ownership labels
asset IDs/hashes
```

But every debug story must carry machine-readable state:

```text
productionEligible: false
```

A promotion action must reject any proof/candidate with debug mode enabled.

## 13. Reduced-motion story behavior

`ReducedMotion` does not rewrite production animation data.

It tests authoring/review UI behavior:

- no unwanted preview autoplay;
- frame scrubbing remains available;
- proof states remain inspectable;
- UI transitions respect reduced-motion preference;
- production motion can still be deliberately previewed by explicit user action where appropriate.

## 14. Accessibility requirements

Controls must:

- be keyboard operable;
- have programmatic labels;
- expose current frame/proof state textually;
- not rely on color alone for pass/fail;
- preserve focus when switching proof state;
- announce async proof-status changes appropriately;
- provide accessible names for debug toggles.

Stable IDs:

```text
A11Y-PREVIEW-001-reduced-motion-no-autoplay
A11Y-STUDIO-001-frame-control-keyboard
A11Y-BENCHMARK-001-proof-state-name
A11Y-BENCHMARK-002-control-focus-persistence
```

## 15. Playwright contract

E2E interacts through stable user-visible semantics or deliberate test IDs tied to public component contracts, not fragile CSS hierarchy.

Example workflow:

```text
open benchmark
select proof state by accessible name
verify exact displayed frame
freeze camera
verify contribution status
open evidence panel
verify source/application IDs
switch debug on
verify production-ineligible status
switch debug off
verify state restored
```

## 16. Snapshot policy

Storybook screenshot snapshots are selective.

Use fixed-frame visual goldens for meaningful states only:

```text
neutral
critical deformation
peak interaction
settled return
known boundary-risk frame
```

Do not snapshot every control permutation.

## 17. Story/Remotion parity test

For selected fixtures, a parity test should compare a normalized runtime-frame-state fingerprint for the same:

```text
scene revision
fixture revision
frame
seed
control mode
runtime versions
```

Storybook and Remotion must produce equivalent semantic state before raster differences are considered.

Planned stable IDs:

```text
CONTRACT-STORY-001-fixture-identity-shared
CONTRACT-STORY-002-proof-frame-shared
CONTRACT-STORY-003-control-semantics-shared
CONTRACT-STORY-004-remotion-state-parity
FAILURE-STORY-001-duplicate-frame-literal
FAILURE-STORY-002-debug-production-eligible
```

## 18. Performance stories

Stress stories are explicit and separate from aesthetic review:

```text
Enki hero preview
Pixi water proof
Three depth-card proof
100-agent crowd
Eridu representative density
Kutu storm representative particle/collider load
```

Performance story results include workstation/browser/runtime profile.

## 19. Promotion boundary

Storybook can produce/review evidence, but it does not directly turn a runtime state into canonical production bytes without the normal candidate/QA/human/promotion transaction.

A green Storybook story is necessary evidence for many capabilities; it is never the sole promotion authority.

## 20. Definition of success

Storybook succeeds when a developer, QA reviewer and human art reviewer can inspect the same exact fixture states that Remotion will render, isolate individual subsystem contributions, exercise negative controls, inspect provenance and accessibility, and do so without creating a second hidden animation implementation.
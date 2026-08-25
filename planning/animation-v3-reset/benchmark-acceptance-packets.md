# Core Benchmark Acceptance Packets v1

Status: **implementation-facing acceptance contract**

This document takes the six minimum platform benchmarks required before Reel 1 V3 production resumes and turns them into named fixture packets with stable test families, proof artifacts, negative cases and human gates.

The six gates are:

```text
B01 Enki Facial Performance
B02 Enki at the Helm
B03 Stag on Water Spatial Proof
B04 Kutu Hail Storm
B05 Igigi Canal Crew
B06 City Growth / Eridu
```

A runtime may pass one benchmark and fail another. Passing B01 does not make Rive universally approved; passing B03 does not make Three the owner of character performance.

## 1. Common packet contract

Every benchmark packet owns:

```text
benchmark ID
fixture version
narrative bindings
source/evidence bindings
runtime ownership
proof-state IDs
control fixtures
negative fixtures
stable test IDs
performance environment
proof artifact bundle
human acceptance criteria
promotion/adoption decision
```

Required terminal decision:

```text
KEEP
KEEP_WITH_CONSTRAINTS
DEFER
REJECT
```

No benchmark ends at `render succeeded`.

---

# B01 — Enki Facial Performance

## Identity

```text
benchmarkId: benchmark:enki-facial:v1
fixtureId: fixture:benchmark:enki-facial:v1
level: L2
primary runtime candidate: Rive
frame authority: Scene V3 / Remotion
source authority: actor:enki + approved visual/editorial source
```

## Required proof states

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

The fixture must define exact frames for all persisted proof states.

## Required channels

```text
face.eye-left-open
face.eye-right-open
face.gaze-x
face.gaze-y
body.breath
```

## Required stable IDs

```text
CONTRACT-RIVE-001-enki-channel-map
STORY-RIVE-001-enki-neutral
STORY-RIVE-002-enki-open
STORY-RIVE-003-enki-closed
VISUAL-ENKI-001-neutral
VISUAL-ENKI-002-blink-closed
VISUAL-ENKI-003-returned-open
MOTION-ENKI-001-natural-blink
SEMANTIC-ENKI-001-blink-readable
SEMANTIC-ENKI-002-identity-stable
FAILURE-ENKI-001-open-at-closed-frame
FAILURE-ENKI-002-cyan-eye-debug-leak
FAILURE-ENKI-003-one-eye-only
FAILURE-ENKI-004-no-return-open
PERF-RIVE-001-hero-preview
HUMAN-ENKI-001-facial-performance
```

## Negative fixtures

```text
negative:enki:open-at-closed:v1
negative:enki:cyan-debug-overlay:v1
negative:enki:left-eye-only:v1
negative:enki:no-return-open:v1
negative:enki:identity-drift:v1
```

## Acceptance

Machine:

- semantic closed state contains no visible iris/pupil/sclera when both eyes should be closed;
- no debug/localization artifact reaches candidate render;
- returned-open state is source-faithful;
- same Scene V3/frame/seed produces same channel state;
- gaze does not translate actor root;
- breath does not move camera.

Human:

- blink reads naturally at normal speed;
- face remains Enki;
- no sticker/patch impression;
- gaze reads as gaze;
- breath is present but restrained.

## Promotion consequence

If green, the Rive facial adapter may advance to `production-capable-for:hero-facial-performance`. It does not yet own arms, full-body acting or all characters.

---

# B02 — Enki at the Helm

## Identity

```text
benchmarkId: benchmark:enki-helm:v1
fixtureId: fixture:benchmark:enki-helm:v1
level: L2 initially; L3 extension later
source scene: scene:ch01:r01:s03
```

## Runtime ownership

```text
Scene V3       timing + drivers + contacts
Rive           Enki local character performance
Pixi           rigging/reed/water material deformation
Vessel runtime rigid vessel hierarchy
Remotion       final frame authority
```

For the later L3 extension, Three may own vessel/world placement while Rive continues to own Enki-local articulation and Pixi receives vessel motion as a driver.

## Required channels

```text
Enki blink/gaze
Enki breath/body shift
Enki helm/tiller gesture
vessel roll/heave
rigging lag
water motion
camera motion
```

At least four **non-camera** channels must materially affect the approved candidate.

## Proof states

```text
START_NEUTRAL
VESSEL_ROLL_PEAK
ENKI_ADJUST
RIGGING_LAG_PEAK
WATER_RESPONSE
SETTLED
```

## Controls

```text
control:helm:level1-baseline:v1
control:helm:character-frozen:v1
control:helm:vessel-frozen:v1
control:helm:rigging-frozen:v1
control:helm:camera-frozen:v1
```

## Stable IDs

```text
CONTRACT-HELM-001-transform-ownership
CONTRACT-HELM-002-contact-binding
STORY-HELM-001-overview
STORY-HELM-002-rigging-lag-peak
VISUAL-HELM-001-start-neutral
VISUAL-HELM-003-rigging-lag-peak
MOTION-HELM-001-vessel-camera-independence
MOTION-HELM-002-helm-adjust
MOTION-RIGGING-001-vessel-lag
SEMANTIC-HELM-001-hand-contact-readable
FAILURE-HELM-001-camera-only-motion
FAILURE-HELM-002-contact-break
FAILURE-HELM-003-rigging-leads-vessel
PERF-PIXI-001-water-proof
HUMAN-HELM-001-combined-v3
```

## Acceptance

- vessel motion exists independently of camera;
- rigging response causally trails vessel input;
- hand/tiller contact remains plausible through authored gesture;
- Enki face identity remains stable;
- no segmentation holes, alpha halos or mask leaks;
- water, rigging and breathing do not visibly share one synchronized loop;
- normal-speed human review prefers the combined result over the Level 1 control for meaningful motion, not just “more motion.”

---

# B03 — Stag on Water Spatial Proof

## Identity

```text
benchmarkId: benchmark:stag-spatial:v1
fixtureId: fixture:benchmark:stag-spatial:v1
level: L3
primary runtime: @remotion/three + React Three Fiber
```

## Required spatial strata

```text
sky
far horizon
coast/mountains
far water
Stag vessel
hero actor if visible
foreground reeds/mist
```

## Ownership

```text
Three/R3F  perspective camera + spatial placement + depth cards/planes
Pixi       bounded water/rigging material detail where useful
Rive       Enki local performance if actor included
Scene V3   timing/seed/ownership bindings
Remotion   frame/render authority
```

## Proof states

```text
CAMERA_START
PARALLAX_EARLY
MID_MOVE
MAX_PARALLAX
FOREGROUND_CROSS
CAMERA_END
```

## Controls

```text
control:stag:flat-2d:v1
control:stag:camera-fixed:v1
control:stag:no-foreground:v1
control:stag:no-depth-separation:v1
```

## Stable IDs

```text
CONTRACT-THREE-001-camera-owned-by-three
CONTRACT-THREE-002-source-plane-registration
STORY-THREE-001-stag-spatial-overview
VISUAL-THREE-001-camera-start
VISUAL-THREE-002-max-parallax
MOTION-THREE-001-reproducible-camera-path
SEMANTIC-THREE-001-spatial-depth-readable
FAILURE-THREE-001-card-edge-exposure
FAILURE-THREE-002-unpainted-geometry
FAILURE-THREE-003-double-root-transform
PERF-THREE-001-depth-card-scene
HUMAN-THREE-001-stag-spatial
```

## Acceptance

- perspective/depth effect is clearly visible at normal speed;
- camera does not expose unpainted card edges/voids within approved crop;
- the source-faithful painterly style remains dominant;
- camera path is reproducible by exact frame;
- boat and water occupy coherent spatial relation;
- Level 3 adds useful parallax/spatial presence rather than revealing the limitations of the source painting.

---

# B04 — Kutu Hail Storm

## Identity

```text
benchmarkId: benchmark:kutu-storm:v1
fixtureId: fixture:benchmark:kutu-storm:v1
level: L3
primary physics candidate: Rapier
```

## Ownership

```text
Rapier      fixed-step authoring/bake for hail/debris/secondary vessel response
Three       world/camera/particle representation
Pixi        optional water/rain surface treatment
Scene V3    simulation binding + bake identity + timing
Remotion    approved bake playback/render
```

No live variable-timestep physics is permitted during canonical render.

## Proof states

```text
CALM_BEFORE
HAIL_ONSET
IMPACT_DENSE
VESSEL_RESPONSE_PEAK
STORM_BREAK
CALM_AFTER
```

## Controls

```text
control:kutu:no-hail:v1
control:kutu:vessel-fixed:v1
control:kutu:same-seed-repeat:v1
control:kutu:different-seed:v1
```

## Stable IDs

```text
CONTRACT-RAPIER-001-fixed-step
CONTRACT-RAPIER-002-bake-bound-to-scene
UNIT-RAPIER-001-seed-repeat
STORY-RAPIER-001-kutu-overview
VISUAL-KUTU-001-hail-density-peak
MOTION-KUTU-001-hail-impact
MOTION-KUTU-002-storm-to-calm
FAILURE-RAPIER-001-variable-timestep
FAILURE-RAPIER-002-bake-hash-mismatch
FAILURE-KUTU-001-physics-explosion
FAILURE-KUTU-002-primary-hull-tunneling
PERF-RAPIER-001-kutu-bake
HUMAN-KUTU-001-storm-readability
```

## Acceptance

- same supported simulation inputs produce approved deterministic bake identity;
- bake hash is bound into resolved scene/proof receipt;
- boat response remains bounded and causally related to authored storm forces;
- primary hull does not show obvious benchmark-scale tunneling;
- hail remains readable rather than visual white noise;
- transition from violent storm to calm is authored and reproducible;
- render plays approved bake exactly rather than recomputing discretionary physics.

---

# B05 — Igigi Canal Crew

## Identity

```text
benchmarkId: benchmark:igigi-crew:v1
fixtureId: fixture:benchmark:igigi-crew:v1
level: L3
runtime category: deterministic crowd/work system
```

## Scale fixtures

```text
fixture:igigi:1-worker:v1
fixture:igigi:5-workers:v1
fixture:igigi:20-workers:v1
fixture:igigi:100-workers:v1
```

## Role/clip vocabulary

```text
dig
lift-silt
carry-silt
walk-loaded
rest
adjust-tool
wait-path
```

Agent variation derives from semantic seed channels such as:

```text
role
clip-phase
path
rest-offset
prop-variant
body-archetype
costume-variant
```

Adding an unrelated agent must not reshuffle every existing worker.

## Proof states

```text
CREW_START
WORK_DISTRIBUTED
CARRY_FLOW
REST_VARIATION
DENSE_WORK
CREW_END
```

## Stable IDs

```text
CONTRACT-CROWD-001-stable-agent-identity
UNIT-CROWD-001-same-seed-schedule
UNIT-CROWD-002-unrelated-agent-isolation
STORY-CROWD-001-one-worker
STORY-CROWD-002-five-workers
STORY-CROWD-003-twenty-workers
STORY-CROWD-004-hundred-workers
VISUAL-CROWD-001-dense-work
MOTION-CROWD-001-work-variation
SEMANTIC-CROWD-001-no-cloned-motion
FAILURE-CROWD-001-perfect-sync
FAILURE-CROWD-002-agent-overlap
FAILURE-CROWD-003-global-reseed
PERF-CROWD-001-100-agent
HUMAN-CROWD-001-work-readability
```

## Acceptance

- same seed gives same role/phase/path schedule;
- unrelated-agent addition does not globally perturb prior agents;
- crowd does not read as cloned synchronized loops;
- benchmark camera has no obvious persistent body overlaps beyond authored tolerance;
- 100-agent proof meets the performance budget defined by the benchmark environment;
- work roles remain legible at intended reel scale;
- visual diversity does not imply unsupported ethnic/cultural caricature.

---

# B06 — City Growth / Eridu

## Identity

```text
benchmarkId: benchmark:city-growth:v1
fixtureId: fixture:benchmark:city-growth:v1
worldId: city:eridu
level: L3
```

## Required states

Initial production-semantic states:

```text
BARREN_OR_BASE
EARLY_SETTLEMENT
CANALIZED
TEMPLE_CENTER
MATURE_CITY
```

These must not be labeled archaeological phases unless later source bindings justify that stronger claim.

## Proof requirements

Every state must retain persistent identity anchors:

```text
major geography
water topology
region IDs
path topology where active
city orientation
key persistent landmarks once introduced
```

New state complexity should be additive/traceable rather than prompt-regenerated replacement.

## Evidence overlay

Mandatory development proof:

```text
EVIDENCE_OVERLAY
```

It displays major feature classification:

```text
DIRECT_SITE
NEAR_PERIOD_CONTEXT
ANALOGICAL
LITERARY_INTERPRETATION
PROJECT_SPECULATION
```

## Stable IDs

```text
CONTRACT-CITY-001-eridu-states-ordered
CONTRACT-CITY-002-major-feature-evidence-classified
UNIT-CITY-001-region-seed-stability
UNIT-CITY-002-unrelated-region-isolation
STORY-CITY-001-eridu-identity
STORY-CITY-002-eridu-evidence-overlay
VISUAL-CITY-001-base-geography
VISUAL-CITY-003-canalized-eridu
VISUAL-CITY-005-mature-eridu
MOTION-CITY-001-growth-transition
SEMANTIC-CITY-001-same-place-growth
FAILURE-CITY-001-unclassified-major-monument
FAILURE-CITY-002-state-replaces-geography
FAILURE-CITY-003-analogue-labeled-direct
PERF-CITY-001-eridu-proof
HUMAN-CITY-001-growth-identity
```

## Acceptance

- every state resolves deterministically;
- persistent geography remains registered;
- development reads as the same place changing;
- major visual claims expose evidence classification;
- analogue/speculative features cannot masquerade as direct site evidence;
- LOD changes representation complexity but not semantic state;
- normal-speed montage reads as development rather than unrelated backgrounds.

---

# 8. Common proof bundle

Each benchmark writes or references:

```text
<benchmark-id>/
  benchmark-definition.json
  resolved-scene.json
  runtime-versions.json
  source-receipt.json
  evidence-receipt.json
  frame-start.png
  frame-anticipation.png
  frame-peak.png
  frame-settle.png
  frame-end.png
  motion-proof.mp4
  deterministic-qa.json
  semantic-qa.json
  performance-receipt.json
  human-review.json
  benchmark-receipt.json
```

Not all large files belong in Git. Retention follows the repository storage policy; receipts retain hashes/paths/status even when heavyweight local proofs are not committed.

# 9. Common benchmark receipt

Conceptual minimum:

```ts
interface BenchmarkReceipt {
  benchmarkId: string;
  fixtureId: string;
  fixtureRevision: number;
  sceneId: string;
  resolvedSceneHash: string;
  sourceHashes: string[];
  runtimeVersions: Record<string, string>;
  testIds: string[];
  proofArtifactHashes: Record<string, string>;
  deterministicStatus: 'PASS' | 'FAIL';
  semanticStatus: 'PASS' | 'FAIL' | 'N/A';
  performanceStatus: 'PASS' | 'FAIL';
  humanStatus: 'APPROVED' | 'REJECTED' | 'PENDING';
  decision: 'KEEP' | 'KEEP_WITH_CONSTRAINTS' | 'DEFER' | 'REJECT';
}
```

# 10. Local-first execution contract

For an implementation-bearing benchmark change:

```text
focused unit/contract tests locally
  ↓
affected lint locally
  ↓
affected build/types locally
  ↓
Storybook interactions/a11y locally
  ↓
affected E2E locally
  ↓
fixed-frame/render proof locally
  ↓
semantic QA where applicable
  ↓
performance proof locally
  ↓
human review when visual candidate changes
  ↓
PUSH
  ↓
GitHub independently re-runs deterministic gates
```

GitHub CI verifies receipts and deterministic test layers. It does not pretend to have reproduced a workstation-only GPU proof unless that render actually runs in CI.

# 11. Platform gate

Reel 1 V3 migration may begin only after B01–B06 have explicit terminal decisions and the capabilities required by the migration are green.

The preferred outcome is not necessarily six `KEEP`s. A `REJECT` can be a successful architecture result if it prevents the wrong runtime from becoming foundational.

What is forbidden is an unresolved benchmark being treated as “probably fine” because another scene looks good.
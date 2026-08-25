# Animation V3 Testing, Provenance and Implementation Roadmap

Status: **planning contract**

This document defines how Level 2/3 animation is tested, reviewed, promoted and phased into Sumer Reel Forge.

The goal is to prevent a repeat of the Shot 3 blink failure mode: many locally reasonable checks passing while the final rendered semantic action is still wrong.

The testing system must prove not only that code executed, but that the intended animation appeared in the actual rendered output.

## 1. Test philosophy

No single test layer is sufficient.

```text
schema/types
    ↓
unit tests
    ↓
Storybook component/state tests
    ↓
fixed-frame visual regression
    ↓
rendered motion proof
    ↓
semantic/perceptual QA
    ↓
E2E production workflow
    ↓
human normal-speed review
```

Each layer answers a different question.

- **Unit:** did the math/state contract behave correctly?
- **Storybook:** can the component/animation be isolated and inspected at meaningful states?
- **Visual:** did a known frame render as expected?
- **Motion proof:** did the intended temporal action really occur?
- **Semantic QA:** does the action read as the intended human concept?
- **E2E:** can Studio successfully perform the real workflow?
- **Human:** does it actually look good and communicate naturally?

## 2. Existing repository foundation

The repository already has useful foundations that V3 must preserve:

- Angular application tests through Nx/Angular;
- Storybook for the Angular Studio;
- Playwright E2E with Chromium, Firefox and WebKit projects;
- trace-on-first-retry;
- many Node `node:test` renderer/animation suites;
- Remotion benchmark/proof compositions;
- deterministic asset manifests, candidate staging and explicit promotion;
- Qwen perceptual review lanes.

V3 builds on these instead of replacing them.

## 3. Storybook strategy

### 3.1 Two Storybook surfaces

#### Angular Studio Storybook

Purpose:

```text
scene editor
timeline
asset browser
source/provenance panel
QA dashboard
approval UI
city editor
actor inspector
runtime diagnostics
```

Current Angular Storybook uses the Angular Webpack framework. Because the app is Angular 22, the reset should evaluate moving Studio Storybook to Storybook Angular/Vite.

Official Storybook documentation states that Angular/Vite supports Angular 21+ and enables the Vitest addon/browser component-testing path:

- https://storybook.js.org/docs/get-started/frameworks/angular-vite

This migration is an explicit phase, not an incidental dependency upgrade.

#### React Animation Lab Storybook

Purpose:

```text
Rive actors
Pixi meshes/materials
Three/R3F scenes
Rapier simulations
Spine evaluation
Scene V3 runtime components
crowds
CityKit
montage
```

This should be Vite-based from the start so Storybook's Vitest addon can transform stories into real browser tests.

Reference:

- https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index

### 3.2 Story naming convention

```text
Actors/Enki/Neutral
Actors/Enki/Blink
Actors/Enki/GazeLeft
Actors/Enki/BlinkAndGaze

Materials/Water/Calm
Materials/Water/Current
Materials/Water/Storm

Physics/Boat/Neutral
Physics/Boat/HailImpact

Crowds/CanalCrew/One
Crowds/CanalCrew/Twenty
Crowds/CanalCrew/OneHundred

World/Eridu/Early
World/Eridu/Mature
```

### 3.3 Required animation controls

Every animation story exposes:

```text
frame
fps
seed
resolution
runtime/backend
debug overlays
QA overlays
source-evidence overlays
```

Playback is available but is not the default test mode.

### 3.4 Five-state animation contract

Every animation story exposes five canonical proof states:

```text
START
ANTICIPATION
PEAK
SETTLE
END
```

Specialized examples:

Blink:

```text
OPEN
CLOSING
CLOSED
OPENING
OPEN
```

Boat:

```text
NEUTRAL
ROLL_LEFT
CENTER
ROLL_RIGHT
SETTLE
```

Crowd work cycle:

```text
READY
WORK_DOWN
WORK_PEAK
RECOVER
READY
```

These named states are used by Storybook interaction tests and visual regression.

## 4. Unit tests

### 4.1 Contract/schema tests

Cover:

- Scene V3 validation;
- runtime-adapter registration;
- historical-source binding validation;
- visual-evidence binding validation;
- promotion/evidence receipt schemas;
- compatibility adapter V2 → V3;
- version migration.

### 4.2 Frame kernel tests

Cover:

- `frame → timeSeconds`;
- progress calculations;
- clip-local frame calculations;
- seeded RNG;
- stable event scheduling;
- deterministic path sampling;
- camera evaluation;
- easing/interpolation;
- clip blending.

### 4.3 Actor/performance tests

Cover:

- clip start/end;
- loop boundaries;
- blend weights;
- face/body channel composition;
- contact constraints;
- pivot transforms;
- gaze targeting;
- blink timing;
- source identity checksum bindings.

### 4.4 Material tests

Cover:

- mesh bounds;
- anchor containment;
- displacement limits;
- rope/rigging causality;
- lag/inertia;
- water periodicity;
- material channel independence;
- no safe-zone intrusion.

### 4.5 World/City tests

Cover:

- city definition validation;
- deterministic building placement;
- route/water networks;
- world-state transitions;
- agriculture/industry activation;
- stable seed results;
- historical-source association.

### 4.6 Crowd tests

Cover:

- deterministic agent count;
- role assignment;
- clip distribution;
- phase distribution;
- path assignment;
- collision/spacing heuristics;
- synchronization score;
- same-seed equality;
- different-seed variation.

### 4.7 Physics tests

Cover:

- fixed timestep;
- construction order;
- deterministic initial state;
- snapshot/checksum repeatability;
- collision events;
- joint limits;
- bake-frame count;
- baked-transform checksum.

Rapier determinism reference:

- https://rapier.rs/docs/user_guides/javascript/determinism/

### 4.8 Historical-source tests

Add a dedicated test target conceptually named:

```text
test:historical-sources
```

Validate:

- known source type;
- valid ETCSL composition ID format;
- line range correctness;
- source URL present;
- adaptation class present;
- confidence present;
- manuscript revision present;
- non-ETCSL sources not mislabeled ETCSL;
- museum object IDs/date/license when visual evidence is used;
- no production scene with an asserted historical claim and zero source binding.

Warnings rather than hard failures may cover:

- visual source far outside intended period;
- analogical rather than direct evidence;
- intentional anachronism;
- speculative reconstruction.

## 5. R3F component testing

Use a dedicated React Three Fiber test renderer for scene-graph/state tests where possible, rather than requiring a GPU for every unit test.

Test concepts:

```text
frame 0
  boat rotation = expected neutral

frame 15
  boat rotation = expected left roll

freeze vessel
  rigging driver contribution = zero/controlled

same frame + same seed
  scene graph state identical
```

GPU/rendered proof remains separate.

## 6. Visual regression testing

Playwright supports screenshot comparisons with `toHaveScreenshot()`.

Reference:

- https://playwright.dev/docs/test-snapshots

Playwright warns that screenshot rendering may differ across OS, hardware, browser versions and configuration. Therefore **golden animation screenshots must be produced in one pinned environment**.

### Pinned visual baseline environment

Record:

```text
OS/container image
Node version
Playwright version
Chromium version
GPU/render backend
fonts
viewport
resolution/device scale
runtime package versions
```

Use Chromium-only golden pixels.

Firefox/WebKit remain functional/interaction E2E coverage unless separate stable baselines are deliberately maintained.

### Fixed-frame visual targets

Every animation primitive has known golden frames.

Example blink:

```text
frame 0   OPEN
frame 98  CLOSING
frame 101 CLOSED
frame 105 OPENING
frame 110 OPEN
```

Example water:

```text
frame 0
frame 15
frame 30
frame 60
frame 90
```

## 7. Artifact-leak regression suite

The Shot 3 investigation becomes a permanent regression family.

Must reject:

- flat cyan mask patches;
- debug red/green/blue masks;
- near-uniform replacement rectangles;
- alpha-empty state layers;
- masks rendered instead of candidate art;
- proof overlays leaking into production;
- candidate path and staged path checksum mismatch;
- semantic QA reviewing a different artifact than Remotion renders.

Must include positive controls to prevent over-sensitive detectors from rejecting legitimate smooth painted eyelids or low-texture source artwork.

The failed `transparent eye artifact proof accepts textured warm eyelid pixels` test is a calibration reminder: a safety gate must reject known bad artifacts **and** preserve representative legitimate art.

## 8. Rendered motion proof

No production animation primitive is accepted using fixed screenshots alone.

Each gets a short proof MP4 or image sequence.

```text
blink-proof.mp4
arm-gesture-proof.mp4
rigging-proof.mp4
water-proof.mp4
boat-physics-proof.mp4
crowd-cycle-proof.mp4
```

### Motion-proof requirements

Check:

- intended region changes;
- expected temporal window;
- minimum meaningful run length;
- no one-frame pop;
- pre/post return where applicable;
- velocity continuity;
- acceleration spikes;
- containment;
- contact;
- artifact leakage;
- source identity;
- semantic action.

### Control renders

For important channels, render controls:

```text
full
channel-disabled
parent-frozen
secondary-frozen
camera-disabled
```

Measure channel contribution rather than merely measuring total frame difference.

## 9. Semantic/perceptual QA

Qwen or successor vision models review rendered evidence, never only source declarations.

Questions should be literal and falsifiable:

```text
Are both eyes visibly closed at any point?
Does the hand remain in contact with the tiller?
Does the character visibly point toward the gate?
Does the boat visibly respond to the hail impact?
Do the workers appear unnaturally synchronized?
Does this still depict the same character?
Does any debug-mask-like color appear over the face?
```

Semantic result is recorded as:

```ts
interface SemanticReviewReceipt {
  model: string;
  modelVersion?: string;
  promptHash: string;
  evidenceHash: string;
  verdict: 'pass' | 'review' | 'fail';
  confidence: number;
  reasons: string[];
}
```

A semantic PASS never overrides deterministic failure.

## 10. Human visual review

Human review remains mandatory.

Order:

1. normal-speed playback;
2. A/B against lower level/control;
3. frame-by-frame only when diagnosing;
4. contact sheet/proof states;
5. explicit accept/reject reasons.

Human acceptance receipt must bind:

```text
commit
scene version
manifest checksum
runtime versions
candidate asset checksums
rendered proof checksum
A/B checksum
historical-source revision
human decision
```

## 11. E2E testing

Playwright should test real Studio workflows rather than engine math.

Current repository E2E already supports Chromium, Firefox and WebKit and uses traces on first retry. Preserve that baseline.

Reference:

- https://playwright.dev/docs/trace-viewer-intro
- https://playwright.dev/docs/videos

Add `video: 'retain-on-failure'` for V3 workflow failures where storage permits.

### E2E scenarios

#### Scene authoring

```text
open Scene V3
load source binding
select actor
select performance clip
scrub exact frame
toggle QA overlay
save
reload
same frame/state restored
```

#### Provenance

```text
open shot
view manuscript binding
view ETCSL composition
view visual evidence
change narrative revision
source relationship preserved/updated
```

#### Candidate lifecycle

```text
generate candidate
candidate remains under tmp
run proof
reject
canonical unchanged

generate candidate
proof pass
human approve
promotion requires confirmation
reload
promoted checksum preserved
```

#### CityKit

```text
create city preset
set development state
add workers
set seed
save
reload
same world state
```

#### Theatre bridge

```text
import authored camera track
compile to Scene V3
save
reload
same keyframes
render proof
```

#### V2 compatibility

```text
open existing Scene V2
resolve through compatibility adapter
compare timing/assets
render same baseline
```

## 12. Storybook testing policy

The Storybook Vitest addon can run stories as browser component tests in Vite-based Storybook.

Reference:

- https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index

Planned story tags:

```text
test
visual
motion
historical
experimental
manual-review
```

Rules:

- stable production primitive stories carry `test`;
- fixed-frame visual stories carry `visual`;
- expensive live playback stories may carry `motion` and be excluded from fast default CI;
- source/provenance UI stories carry `historical`;
- package spikes carry `experimental` until adopted.

## 13. Test matrix by subsystem

| System | Unit | Storybook | Fixed visual | Motion proof | E2E | Semantic | Human |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Frame kernel | yes | yes | no | no | no | no | no |
| Scene V3 schema | yes | yes | no | no | yes | no | no |
| Historical source bindings | yes | yes | no | no | yes | no | review |
| Rive actor | yes | yes | yes | yes | yes | yes | yes |
| Pixi material | yes | yes | yes | yes | yes | yes | yes |
| Three/R3F world | yes | yes | yes | yes | yes | selective | yes |
| Rapier physics | yes | yes | yes | yes | yes | selective | yes |
| Spine animal | yes | yes | yes | yes | yes | selective | yes |
| Crowd system | yes | yes | yes | yes | yes | yes | yes |
| CityKit | yes | yes | yes | yes | yes | selective | yes |
| Montage | yes | yes | yes | yes | yes | yes | yes |
| Theatre import | yes | yes | selective | yes | yes | no | yes |
| Comfy/I2V | contract | review | yes | yes | yes | yes | yes |

No production subsystem is complete if an applicable column is missing.

## 14. CI tiers

Animation rendering is expensive and GitHub Actions minutes are finite. The architecture deliberately separates fast CI from local/milestone render proofs.

### Tier 0 — developer loop

Target: seconds.

```text
affected unit tests
schema validation
specific Storybook tests
specific adapter contract tests
```

### Tier 1 — normal branch/PR CI

Target: low minutes.

```text
lint
types
unit tests
historical-source tests
Storybook build
Storybook component tests
Angular tests
selected API tests
NO full MP4 suite
```

### Tier 2 — local animation proof

Run on the production workstation.

```text
fixed-frame visuals
short motion proofs
semantic render QA
selected E2E
```

### Tier 3 — milestone/release

Run only for promotion or major architecture checkpoints.

```text
full renderer tests
all benchmark proofs
cross-browser Studio E2E
production render
A/B evidence
human review
```

### Evidence receipts instead of rerendering everything in CI

After a local approved proof, commit a compact receipt containing:

```json
{
  "commit": "...",
  "scene": "...",
  "runtimeVersions": {},
  "environment": {},
  "sourceHashes": [],
  "renderHash": "...",
  "frameHashes": [],
  "metrics": {},
  "semanticVerdict": {},
  "humanVerdict": {}
}
```

CI validates receipt structure/checksum relationships instead of re-rendering every expensive proof on every push.

## 15. Proposed scripts

Target command vocabulary:

```text
pnpm animation:v3:test
pnpm animation:v3:test:unit
pnpm animation:v3:test:source
pnpm animation:v3:test:storybook
pnpm animation:v3:test:visual
pnpm animation:v3:test:render
pnpm animation:v3:test:e2e
pnpm animation:v3:benchmark
pnpm animation:v3:quality

pnpm animation:v3:proof --scene=enki-blink
```

These replace the tendency to create a new one-off command for every ordinary animation behavior.

## 16. Ten benchmark scenes

The V3 reset does not return to broad Reel 1 production until the platform proves the narrative demands of Chapters 1–3.

### Benchmark 1 — Enki Facial Performance

Proves:

- blink;
- gaze;
- breath;
- identity;
- source-safe hero rig;
- artifact-leak regression.

### Benchmark 2 — Enki at Helm

Proves:

- body/arm articulation;
- hand/tiller contact;
- boat hierarchy;
- rigging causality;
- water material;
- camera.

### Benchmark 3 — Enlil Council Address

Proves:

- hero speech gestures;
- expression;
- audience reaction;
- crowd/listener performance;
- formal interior blocking.

### Benchmark 4 — Sud / Nisaba / Haia

Proves:

- three-actor domestic blocking;
- emotional reaction;
- listening/gaze;
- seated/standing transitions;
- dialogue pacing.

### Benchmark 5 — Stag on Water

Proves:

- R3F spatial world;
- water plane/material;
- perspective camera;
- painted depth-card preservation;
- vessel/world placement.

### Benchmark 6 — Kutu Hail Storm

Proves:

- fixed-step physics;
- particles;
- hail trajectories/collisions;
- vessel response;
- weather lighting;
- baked simulation receipt.

### Benchmark 7 — Igigi Canal Crew

Proves:

- at least 20 visible workers initially, scalable to 100 benchmark agents;
- work clip variation;
- tools/props;
- deterministic crowd;
- synchronization QA;
- route/terrain interaction.

### Benchmark 8 — Marriage Herd Procession

Proves:

- reusable animal rigs;
- herds;
- procession paths;
- goods/loads;
- dust/atmosphere;
- crowd + animal integration.

### Benchmark 9 — City Growth

Proves:

- CityKit;
- settlement state transitions;
- canal/agriculture/architecture growth;
- population activation;
- historical/visual evidence bindings.

### Benchmark 10 — Long Journey Montage

Proves:

- long-timescale montage;
- continuity subjects;
- seasonal/environment transitions;
- temporal compression;
- narrative source labeling for speculative/historical-fiction sections.

## 17. Implementation phases

### Phase 0 — Architecture freeze

Deliverables:

- these planning documents accepted;
- naming/ownership boundaries accepted;
- no package installs yet.

Exit:

- no unresolved foundational question about who owns timing, provenance, promotion or testing.

### Phase 1 — Historical source registry

Build:

- ETCSL composition registry;
- non-ETCSL ancient-source registry;
- visual-evidence schema;
- manuscript revision/source bindings;
- Studio provenance read-only view.

Tests:

- unit/source validation;
- Storybook source cards;
- E2E provenance navigation.

### Phase 2 — Frame kernel + Scene V3 contracts

Build:

- `FrameContext`;
- Scene V3 types/schema;
- deterministic RNG;
- event/track evaluator;
- runtime registry;
- fake test adapters.

Tests:

- exhaustive unit/property tests;
- Storybook state viewer.

### Phase 3 — Animation Lab

Build:

- React/Vite animation-lab app/package;
- animation Storybook;
- frame/seed/debug controls;
- common evidence overlays.

Evaluate:

- Angular Storybook migration to Angular/Vite.

### Phase 4 — Pixi runtime

Build:

- mesh plane;
- rope;
- displacement;
- deterministic uniforms;
- contained material adapter.

Proof:

- water + rigging.

### Phase 5 — Rive runtime

Build:

- frame-controlled Rive adapter;
- actor package format;
- performance clip integration;
- source/identity checks.

Proofs:

- Enki facial performance;
- Enki helm articulation;
- Enlil address.

### Phase 6 — Three/R3F spatial runtime

Build:

- exact-version `@remotion/three` integration;
- camera/depth-card system;
- spatial prop/actor transforms;
- lighting/fog baseline.

Proof:

- Stag on Water.

### Phase 7 — Rapier simulation

Build:

- fixed-step simulation runner;
- bake format;
- simulation receipts;
- Scene V3 playback adapter.

Proof:

- Kutu Hail Storm.

### Phase 8 — Crowd/work runtime

Build:

- deterministic agent scheduler;
- role/clip variation;
- routes;
- work tools;
- synchronization metric.

Proof:

- Igigi Canal Crew.

### Phase 9 — Spine/animal evaluation

Compare:

- Rive animals versus Spine;
- workflow cost;
- runtime performance;
- license implications;
- authoring quality.

Proof:

- marriage herd/procession.

Decision:

- adopt Spine for animal/repeated rigs, or standardize on Rive.

### Phase 10 — CityKit

Build:

- city schema;
- terrain/water/route systems;
- agriculture;
- industry;
- architecture presets;
- development states.

Proof:

- one city settlement → mature state.

### Phase 11 — Montage runtime

Build:

- segment timeline;
- continuity bindings;
- environment/time transitions;
- source/adaptation labels across segments.

Proof:

- long journey.

### Phase 12 — Theatre authoring bridge

Build:

- camera/light/object-track import;
- JSON validation;
- compile/bake to Scene V3;
- round-trip evidence.

Theatre Studio remains development-only.

### Phase 13 — Unified animation QA

Consolidate:

- artifact leakage;
- motion contribution;
- identity;
- contact;
- containment;
- semantic QA;
- proof receipts;
- human acceptance binding.

### Phase 14 — Benchmark milestone

Run all ten benchmarks.

Exit requires:

- unit green;
- Storybook green;
- fixed-frame visual approved;
- motion proof green;
- semantic review green/reviewed;
- E2E green;
- human review green.

### Phase 15 — Reel 1 migration

Only now return to broad Reel 1 production.

Order:

1. migrate Shot 3 to prove old diagnostic pain is solved by platform;
2. migrate Shot 4 underwater scene;
3. migrate Shot 8 landfall/spatial boat;
4. migrate other shots only when V3 adds value;
5. preserve V2 compatibility throughout;
6. rerun canonical Reel 1 milestone proof before calling Level 2/3 migration complete.

## 18. Package adoption gates

No package is adopted merely because a demo looks impressive.

For every proposed dependency document:

```text
capability gained
runtime ownership
React/Angular compatibility
Remotion compatibility
deterministic control method
headless/test strategy
license
bundle/runtime cost
authoring cost
failure mode
exit/replacement strategy
```

Specific notes:

- Rive runtimes are open source/MIT, but editor/export plan requirements should be confirmed before full commitment.
- PixiJS is core candidate for raster/material work.
- `@remotion/three` must match Remotion version exactly.
- Rapier determinism depends on controlled inputs/order/version.
- Spine requires an explicit licensing decision before production adoption.
- Theatre is authoring-only.
- Live2D remains optional unless close-up facial performance requirements justify it.

## 19. Historical-fiction revision workflow

When narrative text changes:

```text
new manuscript revision
        ↓
source-diff review
        ↓
update adaptation class if needed
        ↓
update ETCSL/non-ETCSL bindings
        ↓
update visual evidence if staging changes
        ↓
regenerate affected scene plans
        ↓
rerun affected source tests + animation proofs
```

Narrative evolution is expected. Provenance drift is not.

## 20. Exit criteria before coding begins

Before Phase 1 implementation, confirm:

- Level 2/Level 3 boundary accepted;
- Scene V3 owns time and intent;
- Remotion remains render authority;
- Rive/Pixi/Three/Rapier responsibilities accepted;
- Spine is evaluation, not mandatory dependency;
- Storybook is a required animation test surface;
- fixed-frame visual tests and motion proofs are both required;
- ETCSL and non-ETCSL sources are tracked distinctly;
- manuscript historical-fiction revisions are allowed with provenance updates;
- local workstation remains primary expensive-render environment;
- broad Reel 1 work stays paused until benchmark milestone.

Once these are accepted, implementation can begin with **Phase 1: Historical Source Registry**, not with another Shot 3 animation patch.

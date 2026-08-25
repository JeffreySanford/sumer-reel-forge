# Animation V3 Phase Exit Checklists

Status: **planning contract**

This document converts the V3 implementation roadmap into explicit exit gates. A phase is not complete because code exists. It is complete only when its applicable local tests, GitHub Actions checks, render proofs and human reviews are green.

Common status fields:

```text
LOCAL_FOCUSED_GREEN
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

Not every phase requires render/human approval, but every code phase requires local + CI green.

## Phase 0 — Architecture / planning

Deliverables:

- narrative-source map;
- Level 2 specification;
- Level 3 architecture;
- testing/provenance roadmap;
- package adoption matrix;
- Scene V3 contract design;
- benchmark specifications;
- Storybook contract;
- migration/release strategy;
- performance/render budget;
- implementation backlog;
- ADRs;
- chapter capability matrix;
- local/CI quality contract;
- test fixture catalog;
- risk register;
- phase exit checklists.

Exit:

```text
[ ] planning index references all contracts
[ ] no contradictory runtime ownership remains
[ ] every foundation package has a benchmark
[ ] testing responsibilities are explicit
[ ] local-first + CI-second rule accepted
```

No CI/render gate required for documentation-only phase.

## Phase 1 — Historical-source foundation

Deliverables:

- `libs/historical-sources`;
- ETCSL composition records;
- non-ETCSL source support;
- adaptation classifications;
- visual evidence contract;
- Chapter 1–3 initial narrative bindings;
- source validation/reporting;
- read-only Studio provenance surface;
- Storybook provenance stories.

Local focused gate:

```bash
pnpm nx test historical-sources
pnpm nx build historical-sources
```

Expanded local phase gate:

```text
[ ] historical-sources lint
[ ] historical-sources tests
[ ] historical-sources build
[ ] Studio unit tests
[ ] provenance Storybook stories/tests
[ ] Storybook build
[ ] focused provenance E2E
[ ] workspace check
```

CI gate:

```text
[ ] frozen install
[ ] workspace check
[ ] lint
[ ] unit
[ ] build
[ ] Storybook build/test
[ ] focused/full browser E2E
```

Exit evidence:

```text
LOCAL_PHASE_GREEN
CI_GREEN
```

No render proof required.

## Phase 2 — FrameContext / Scene V3 contracts

Deliverables:

- `animation-frame`;
- `animation-contracts`;
- semantic-channel RNG;
- runtime registry;
- resolved scene contract;
- Scene V2 compatibility adapter contract;
- schema/version migration scaffolding.

Unit requirements:

```text
frame → seconds
clip-local frame
progress boundaries
semantic seed stability
same-seed repeat
unrelated-channel stability
Scene V3 schema positives/negatives
runtime capability validation
resolved-scene immutability
V2 timing preservation
```

Storybook:

```text
Foundation/FrameContext
Foundation/SeedChannels
Foundation/SceneV3Resolved
Foundation/SceneV2Compatibility
```

E2E:

- load a V2 fixture through V3 compatibility;
- scrub exact frame;
- confirm resolved values displayed by Studio/fixture shell.

Local exit:

```text
[ ] lint
[ ] unit
[ ] build
[ ] Storybook build/tests
[ ] focused E2E
[ ] no runtime dependency required yet
```

CI exit:

same deterministic categories repeated.

## Phase 3 — Animation Lab / Storybook harness

Deliverables:

- React/Vite Animation Lab app;
- Storybook config;
- exact-frame controls;
- seed/debug/source overlays;
- shared proof-state fixture loader;
- browser Storybook tests;
- pinned screenshot environment config.

Required stories:

```text
Foundation/FrameContext
Foundation/SeedChannels
Historical/ETCSLBinding
Historical/FictionalBridge
```

Unit:

- control/frame mapping;
- fixture loader;
- proof-state selection.

Storybook:

- interaction tests green;
- build green;
- first pinned Chromium screenshot fixture.

E2E:

- launch lab;
- choose fixture;
- change frame/seed;
- reload stable state.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
```

No production animation proof required yet.

## Phase 4 — Pixi material runtime

Deliverables:

- Pixi adapter;
- explicit frame advancement/manual ticker policy;
- mesh plane primitive;
- rope/rigging primitive;
- displacement/water primitive;
- material evidence hooks.

Unit:

- deterministic vertex state;
- anchor bounds;
- rope causality;
- lag/settle math;
- same-frame repeat;
- production ticker disabled.

Storybook:

```text
Materials/Water/Calm
Materials/Water/Current
Materials/Rigging/VesselDriven
Materials/Rigging/Negative/Detached
```

Visual goldens:

- water calm/current proof frames;
- rigging response peak.

Motion proof:

- water current;
- vessel-driven rigging.

E2E:

- open material story/proof;
- scrub frame;
- render/inspect compact proof receipt.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

Human approval verifies material motion improves on bespoke V2 behavior.

## Phase 5 — Rive hero runtime

Deliverables:

- Rive adapter;
- Enki minimal rig;
- explicit frame/state advancement;
- blink/gaze/breath performance clips;
- identity/source evidence.

Unit:

- channel mapping;
- explicit advancement;
- no autonomous production playback;
- clip blend boundaries;
- asset/version binding.

Storybook:

```text
Actors/Enki/Neutral
Actors/Enki/Blink
Actors/Enki/GazeLeft
Actors/Enki/GazeRight
Actors/Enki/Breath
Actors/Enki/BlinkAndGaze
Actors/Enki/Negative/OpenAsClosed
Actors/Enki/Negative/CyanEyePatch
```

Visual goldens:

- OPEN;
- CLOSED;
- RETURNED_OPEN.

Motion proof:

- natural blink;
- blink+gaze+breath composition.

Semantic QA:

- both eyes visibly close;
- identity stable;
- reopen clean.

Human:

- obvious natural blink at normal speed;
- preferred to PNG-state workaround.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

If Rive cannot pass, stop and record reject/alternate plan before proceeding.

## Phase 6 — Three/R3F spatial runtime

Deliverables:

- Three/R3F adapter;
- matching `@remotion/three` version;
- depth-card primitive;
- spatial camera;
- actor billboard/card placement;
- spatial fog/light baseline.

Unit:

- scene graph transforms;
- camera track evaluation;
- depth ordering;
- approved camera travel bounds;
- same frame/seed state.

Storybook:

```text
World/DepthCards/Basic
World/Camera/Dolly
World/Camera/Parallax
Actors/SpatialPlacement
```

Visual:

- pinned proof frames.

Motion:

- Stag spatial camera proof.

Human:

- retains painted look;
- no invented geometry reveal;
- spatial motion adds value.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

## Phase 7 — Combined Enki-at-helm V3 proof

Deliverables:

- Rive Enki;
- Pixi water/rigging;
- Three spatial boat/world;
- shared Scene V3;
- exact asset/runtime receipt.

Unit/integration:

- transform ownership;
- actor/world mapping;
- rigging vessel driver;
- camera contribution separation;
- resolved asset hashes.

Storybook:

```text
Benchmarks/EnkiAtHelm/Start
Benchmarks/EnkiAtHelm/CharacterPeak
Benchmarks/EnkiAtHelm/RiggingPeak
Benchmarks/EnkiAtHelm/Settle
```

Motion proof:

- combined 5–7 second benchmark.

Required A/B:

- approved V2 Level 1/2 baseline vs V3.

Human acceptance:

- at least three meaningful improvements;
- no compensating source-fidelity loss;
- unmistakably animated at normal speed.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

This is a major gate before broad Reel 1 return.

## Phase 8 — Rapier fixed-step/baked physics

Deliverables:

- physics adapter;
- fixed-step runner;
- bake format;
- receipt/hash format;
- hail/boat compact benchmark.

Unit:

- timestep enforcement;
- construction-order hash;
- repeated bake checksum;
- collision event schedule;
- invalid variable-step rejection.

Storybook:

```text
Physics/Boat/Roll
Physics/Hail/Impact
Physics/Hail/StormSequence
Physics/Negative/VariableTimestep
```

Motion proof:

- Kutu hail compact sequence.

Human:

- physical response believable and art-directable.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

## Phase 9 — Crowd/work runtime

Deliverables:

- deterministic crowd scheduler;
- role/clip/path assignment;
- synchronization score;
- canal worker fixture.

Unit:

- 1/20/100 count;
- same-seed repeat;
- different-seed variation;
- role distribution;
- phase distribution;
- path occupancy;
- synchronized negative rejection.

Storybook:

```text
Crowds/CanalCrew/One
Crowds/CanalCrew/Twenty
Crowds/CanalCrew/OneHundred
Crowds/CanalCrew/Negative/Synchronized
```

Performance:

- target workstation preview budget met.

Motion/human:

- workers read as purposeful varied labor, not dancing clones.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

## Phase 10 — Animal/herd strategy

Deliverables:

- baseline animal rig strategy;
- Rive/native instancing evaluation;
- Spine spike only if justified;
- mixed herd/procession fixture.

Tests:

- species/rig mapping;
- deterministic herd population;
- phase/path variation;
- LOD/count budgets;
- clone-sync negative;
- licensing/adoption ADR updated if Spine chosen.

Storybook:

```text
Animals/Ox/Walk
Animals/Sheep/Graze
Animals/Herd/Twenty
Animals/Procession/MixedSpecies
```

Benchmark:

- Chapter 2 marriage herd procession.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
PACKAGE_DECISION_RECORDED
```

## Phase 11 — CityKit / world states

Deliverables:

- CityDefinition;
- development states;
- terrain/water/architecture/industry/population profiles;
- initial Eridu/Dilmun + one Chapter 3 city profile.

Unit:

- schema;
- deterministic placement;
- water graph;
- state activation;
- historical/visual evidence bindings;
- city identity persistence.

Storybook:

```text
World/Dilmun/Barren
World/Dilmun/Watered
World/Dilmun/Cultivated
World/Eridu/Early
World/Eridu/Mature
```

E2E:

- load city;
- change development state;
- save/reload;
- same seed stable.

Benchmark:

- settlement → functioning city.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

## Phase 12 — Montage runtime

Deliverables:

- MontageDefinition;
- continuity subjects;
- segment transitions;
- temporal scale metadata;
- long journey fixture.

Unit:

- segment ordering;
- timing;
- continuity identity;
- deterministic transitions;
- no hidden real-time stretching.

Storybook:

```text
Montage/Journey/ThreeSegments
Montage/Journey/LongContinuity
Montage/CityGrowth
```

Benchmark:

- Chapter 2 long journey.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

## Phase 13 — Theatre authoring bridge

Deliverables:

- authoring spike;
- export format;
- compiler to Scene V3 tracks;
- round-trip fixture.

Unit:

- exported track validation;
- conversion determinism;
- unsupported hidden state rejection.

Storybook/E2E:

- load exported camera track;
- compare baked Scene V3 evaluation.

Render proof:

- camera path before/after export equivalent within tolerance.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
```

Human approval only if authoring changes visual result rather than workflow.

## Phase 14 — Unified QA/evidence system

Deliverables:

- common proof receipt;
- runtime/source hashes;
- proof-state schedule;
- deterministic metrics;
- semantic-review attachment;
- human decision record;
- stale-evidence detection.

Unit:

- receipt schema;
- stale hash rejection;
- runtime-version mismatch;
- missing required proof state;
- negative fixture binding.

Storybook:

- evidence inspector stories.

E2E:

- create proof;
- reject;
- promote;
- stale proof blocked.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
```

Then replay foundation benchmark receipts through unified system.

## Phase 15 — Reel 1 V3 migration

Rules:

- shot-by-shot only;
- V2 baseline retained;
- A/B required;
- no timing drift without editorial change;
- each migrated shot gets source/runtime receipt.

Per-shot local gate:

```text
unit/adapter tests
lint
build
Storybook relevant states
focused E2E if Studio behavior changed
short rendered proof
human A/B
```

CI:

- deterministic contracts/workflow tests repeated.

Reel exit:

- all selected shots promoted;
- canonical 60-second assembly green;
- full-reel normal-speed human review;
- rollback path retained.

## Phase 16 — Chapter 2 production readiness

Required benchmark green:

- Enlil Council Address;
- Sud/Nisaba/Haia three-actor conversation;
- marriage herd procession;
- long journey montage;
- ceremony/interior environment.

All require local + CI + render + human where visual.

## Phase 17 — Chapter 3 production readiness

Required benchmark green:

- Igigi canal crew;
- CityKit city growth;
- agriculture work system;
- construction work system;
- animal population;
- multiple historically bound city profiles;
- montage/time compression.

All require local + CI + render + human where visual.

## Universal phase-stop conditions

Stop implementation and return to planning when:

```text
runtime ownership becomes ambiguous
same proof differs between Storybook and Remotion
local/CI commands diverge semantically
new dependency has unresolved license issue
benchmark requires invented geometry beyond approved boundary
performance misses iteration budget by >2x
visual quality repeatedly fails despite technical green
new failure class bypasses existing test layers
```

A stop condition is not project failure. It is the mechanism that prevents sunk-cost architecture from becoming permanent.

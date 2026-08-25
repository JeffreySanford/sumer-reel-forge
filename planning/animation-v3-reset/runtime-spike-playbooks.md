# Runtime Spike Playbooks

Status: **planning contract**

Every major animation dependency enters Sumer Reel Forge through a bounded benchmark spike. This document defines the exact questions, proof artifacts and test gates each spike must satisfy before production adoption.

## 1. Shared spike rules

Every spike must:

- be isolated on a `spike/*` branch;
- pin exact package/runtime versions;
- document license implications;
- use a manuscript-derived benchmark;
- obey Scene V3/FrameContext timing;
- add unit + Storybook + applicable E2E/render proof;
- include negative/failure fixtures;
- produce a KEEP / KEEP_WITH_CONSTRAINTS / DEFER / REJECT decision;
- update ADR/package-adoption docs.

## 2. Shared evidence package

```text
spike-summary.md/json
package versions
license notes
local quality results
Storybook proof states
render proof receipt
performance metrics
failure notes
adoption verdict
```

## 3. Rive spike — Enki hero performance

### Benchmark

Enki blink + gaze + breath, then small head/torso/arm articulation.

### Questions

- Can source-faithful raster artwork be rigged without unacceptable repainting?
- Can host code seek/advance to an exact frame deterministically?
- Can both eyes close naturally without PNG-state generation?
- Can facial/body channels combine independently?
- Can `.riv` asset/version be checksum-bound and reproduced?
- Does Storybook/browser render consistently enough for authoring?
- Does Remotion render the same named proof states?

### Required proof states

```text
NEUTRAL
BLINK_CLOSING
BLINK_CLOSED
BLINK_OPENING
RETURNED_OPEN
GAZE_LEFT
GAZE_RIGHT
BREATH_PEAK
ARM_GESTURE_PEAK
```

### Unit tests

- clip/channel mapping;
- exact frame -> runtime time;
- input/state machine setting;
- reset/seek behavior;
- no autonomous wall-clock reliance;
- rig source/version validation.

### Storybook

- Enki neutral;
- blink;
- gaze;
- breathe;
- combined blink/gaze/breathe;
- arm gesture;
- debug rig channels.

### Negative tests

- stale rig version;
- missing state input;
- wall-clock autoplay disabled in production mode;
- source hash mismatch;
- closed-eye proof state not semantically closed => benchmark fail.

### Adoption gate

KEEP only if normal-speed blink and small performance clearly beat current V2 workaround without identity loss.

## 4. PixiJS spike — water and rigging

### Benchmarks

- calm gulf water;
- vessel-driven rigging with lag/inertia;
- optional reed/cloth mesh.

### Questions

- Can Pixi render exact frame state without autonomous ticker?
- Can mesh deformation remain bounded and source-safe?
- Can Pixi coexist with Remotion/React rendering lifecycle?
- Can rendered pixels remain stable enough for proof tests?
- Can rope/water drivers be fed from shared FrameContext?

### Required proof states

```text
WATER_NEUTRAL
WATER_PEAK_A
WATER_PEAK_B
RIGGING_NEUTRAL
RIGGING_LAG_PEAK
RIGGING_SETTLE
```

### Unit tests

- mesh bounds;
- deterministic driver values;
- rope anchor positions;
- no face/safe-zone intrusion;
- ticker disabled/manual;
- same frame/seed state equality.

### Storybook

- water calm/current/storm parameterization;
- rigging vessel-driven/frozen control;
- deformation debug mesh.

### Negative

- autonomous ticker changes same frame -> fail;
- deformation exceeds bound -> fail;
- missing anchor -> fail.

## 5. Three/R3F spike — Stag spatial proof

### Benchmark

Painted-depth-card boat/coast/water scene with real perspective camera movement.

### Questions

- Can source paintings survive 2.5D depth placement without looking like cardboard cutouts?
- Can exact frame camera state be shared between Storybook and Remotion?
- Can hidden geometry exposure be avoided?
- Can Rive/Pixi outputs later be placed/composited without transform ambiguity?
- Does `@remotion/three` version lockstep work with current Remotion?

### Proof states

```text
CAMERA_START
PARALLAX_25
PARALLAX_50
PARALLAX_75
CAMERA_END
```

### Unit/component tests

- camera transform evaluation;
- depth-card ordering;
- scene graph state via R3F test renderer where practical;
- aspect/resolution mapping;
- world-to-screen mapping fixture.

### Storybook

- static depth cards;
- camera scrub;
- occlusion/debug depth;
- source vs spatial A/B.

### Negative

- camera reveals unapproved back/edge geometry;
- actor billboard flips unexpectedly;
- same frame differs after render order change.

## 6. Rapier spike — Kutu hail/boat response

### Benchmark

Short fixed-step storm: hail/debris impacts and constrained secondary vessel response.

### Questions

- Is JS/WASM simulation deterministic under identical version/state/order/timestep?
- Can we bake approved transforms and replay them without physics runtime?
- Are collision/secondary effects art-directable enough?
- Does local generation fit workstation performance budget?

### Required proof

```text
simulation definition
repeat bake A
repeat bake B
hash equality
playback proof
human storm review
```

### Unit tests

- fixed timestep only;
- construction order hash;
- seed stability;
- bake frame count;
- collision event determinism;
- bake serialization/round-trip.

### Negative

- variable timestep rejected;
- construction order change changes expected receipt;
- engine version mismatch marks bake stale.

## 7. Spine spike — marriage herd

Status: deferred until Rive/native alternative tested.

### Benchmark

Mixed herd/procession with repeated animals and controlled gait variation.

### Questions

- Does Spine substantially outperform Rive/native rigging for repeated animals?
- Is editor/runtime licensing acceptable?
- Can gait phase and path variation be deterministic?
- Can runtime integrate with Pixi/Three without duplicate transform authority?
- Is authoring burden justified?

### Proof states

```text
ONE_ANIMAL
TEN_ANIMALS
MIXED_HERD
PROCESSION
LOD_DISTANCE
```

### Negative

- runtime/editor version mismatch;
- gait clones in sync;
- missing atlas/attachment;
- license constraint incompatible with intended use.

## 8. Theatre.js spike — camera authoring round trip

### Benchmark

Author one spatial camera/light track in visual editor and export to Scene V3.

### Questions

- Can authored data export deterministically?
- Can production build omit Studio dependency/state?
- Can exported track reproduce exact camera frames without Theatre runtime ownership?
- Does authoring materially improve workflow over direct Studio timeline editing?

### Required proof

```text
Theatre-authored source
export JSON
compile to Scene V3
render exact frames
compare to authoring preview
```

### Negative

- hidden local editor state required -> reject;
- export order nondeterministic -> block;
- production render changes if Theatre Studio unavailable -> reject.

## 9. Live2D optional spike

Trigger only if portrait/dialogue close-ups later justify it.

Benchmark:

- close facial performance vs Rive.

Gate includes proprietary Core/licensing analysis and clear improvement over Rive.

## 10. Generative/I2V spike

Generative systems are not allowed to enter as general runtime replacements.

Benchmark must be a narrowly defined motion/effect deterministic rigs cannot economically create.

Required bindings:

```text
source hashes
model/workflow versions
prompt hash
seed
candidate output hash
independent rendered/semantic QA
human review
```

Negative proof includes identity drift and source mismatch.

## 11. Performance metrics shared by all spikes

Record:

```text
cold startup
warm preview
proof render duration
peak RAM
peak VRAM if measurable
bundle size impact
cache behavior
failure recovery
```

No dependency is accepted solely on image quality.

## 12. Browser compatibility

At minimum:

- Chromium authoring path;
- Firefox selected Studio/Storybook smoke where runtime supports it;
- production Remotion path;
- WebGL/WebGPU fallback behavior documented.

## 13. Accessibility

Engine canvas itself may not expose semantic content, so Studio must provide accessible controls/state outside the canvas.

Spike verifies:

- frame/play controls keyboard accessible;
- reduced-motion Studio policy respected;
- engine does not force autoplay.

## 14. Local gate before push

Each spike locally runs:

```text
adapter unit
lint/build
Storybook build/tests
benchmark proof
negative fixture
performance measurement
human review when visual claim is made
```

GitHub Actions repeats ordinary deterministic unit/lint/build/Storybook/E2E where feasible; expensive render proof stays receipt-bound locally.

## 15. Decision record

Final spike summary must state one of:

### KEEP

Default runtime for stated responsibility.

### KEEP_WITH_CONSTRAINTS

Accepted only for explicitly documented use cases/limits.

### DEFER

Promising but no current manuscript requirement justifies cost.

### REJECT

Does not meet determinism, licensing, fidelity, workflow or performance requirements.

## 16. Success criterion

A runtime earns production adoption only by solving a real Chapter 1–3 capability better than our existing tools while fitting Scene V3 timing, testing, provenance and performance contracts.

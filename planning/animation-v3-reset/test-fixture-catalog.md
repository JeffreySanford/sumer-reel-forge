# V3 Test Fixture and Story Catalog

Status: **planning contract**

This document defines the shared fixtures that unit tests, Storybook, visual regression, rendered motion proofs and E2E workflows should reuse.

The purpose is to prevent the same class of failure that occurred in Shot 3: one test path validating a conceptual candidate while the production renderer consumed or displayed a different state.

## 1. Fixture hierarchy

```text
NarrativeFixture
    ↓
SourceFixture
    ↓
SceneFixture
    ↓
RuntimeFixture
    ↓
ProofStateFixture
    ↓
RenderFixture
    ↓
ReceiptFixture
```

A proof state should be addressable by stable ID across every layer.

Example:

```text
fixture: actors/enki/facial-v1
state: CLOSED
frame: 101
seed: 48012
```

Unit, Storybook and rendered proof should all reference that identity rather than independently inventing equivalent numbers.

## 2. Proposed fixture directories

```text
libs/
  animation-test-fixtures/
    src/
      narrative/
      sources/
      scenes/
      actors/
      materials/
      physics/
      crowds/
      cities/
      montage/
      proof-states/
      negative/

apps/
  animation-lab/
    src/stories/

fixtures/
  visual-goldens/
  render-receipts/
  compact-assets/
```

Large binary/video outputs stay outside normal source control unless deliberately approved as compact milestone evidence.

## 3. Fixture rules

Every production fixture must be:

- deterministic;
- small enough for local/CI usage where intended;
- named semantically;
- source/provenance-bound when historical content is represented;
- independent of `tmp/` paths;
- free of external network dependencies;
- versioned when meaning changes.

## 4. Proof-state contract

Generic animation state names:

```ts
type ProofStateName =
  | 'START'
  | 'ANTICIPATION'
  | 'PEAK'
  | 'SETTLE'
  | 'END';
```

Subsystem-specific names are preferred when more semantic:

Blink:

```text
OPEN
CLOSING
CLOSED
OPENING
RETURNED_OPEN
```

Boat:

```text
NEUTRAL
ROLL_LEFT
CENTER
ROLL_RIGHT
SETTLE
```

Speech:

```text
LISTENING
PRE_GESTURE
ADDRESS_PEAK
RECOVERY
LISTENING_END
```

Crowd work:

```text
READY
WORK_DOWN
WORK_PEAK
RECOVER
READY_END
```

City growth:

```text
BARREN
EARLY_SETTLEMENT
INFRASTRUCTURE
EXPANDING
MATURE
```

## 5. Required positive and negative fixtures

### Hero face

Positive:

- normal blink;
- gaze left/right;
- breathing;
- blink + gaze composition.

Negative:

- open eyes mislabeled closed;
- cyan/debug overlay;
- misplaced eye region;
- identity drift;
- one-eye-only blink unless explicitly authored;
- no reopen.

### Hero body

Positive:

- shoulder/arm gesture;
- weight shift;
- hand maintains contact with prop.

Negative:

- camera-only movement;
- detached hand;
- limb pop;
- unsupported mesh excursion;
- mirrored clone motion.

### Water

Positive:

- calm;
- current;
- storm;
- underwater refraction.

Negative:

- whole-frame camera motion counted as water;
- mask edge leakage;
- periodic seam;
- impossible source deformation.

### Rigging / rope

Positive:

- vessel-driven delayed response;
- settle.

Negative:

- independent arbitrary oscillator;
- face occlusion;
- detached anchor;
- instantaneous response with no expected lag.

### Physics

Positive:

- fixed-step repeatability;
- bounded hail impact;
- boat response.

Negative:

- variable timestep;
- changed body creation order causing unsupported receipt;
- NaN/exploding transforms;
- missing bake hash.

### Crowd

Positive:

- 1 worker;
- 20 workers;
- 100 workers;
- same seed repeat;
- different seed variation.

Negative:

- perfect synchronized loop;
- overlapping spawn pile;
- missing role distribution;
- nondeterministic count.

### City

Positive:

- early settlement;
- canal infrastructure;
- mature city;
- deterministic same-seed layout.

Negative:

- mature structure exists before activation state;
- water network disconnected;
- source/evidence binding missing for asserted reconstruction;
- city identity lost between states.

## 6. Storybook catalog — Animation Lab

### Foundation

```text
Foundation/FrameContext
Foundation/SeedChannels
Foundation/SceneV3Resolved
Foundation/SceneV2Compatibility
```

### Historical/provenance

```text
Historical/ETCSLBinding
Historical/NonETCSLBinding
Historical/FictionalBridge
Historical/VisualEvidence
Historical/IntentionalAnachronism
```

### Actors / Enki

```text
Actors/Enki/Neutral
Actors/Enki/Blink
Actors/Enki/GazeLeft
Actors/Enki/GazeRight
Actors/Enki/Breath
Actors/Enki/BlinkAndGaze
Actors/Enki/HelmGesture
Actors/Enki/Negative/CyanEyePatch
Actors/Enki/Negative/IdentityDrift
```

### Actors / Enlil

```text
Actors/Enlil/Neutral
Actors/Enlil/FormalAddress
Actors/Enlil/AngryAddress
Actors/Enlil/Listening
Actors/Enlil/TurnAndWalk
```

### Multi-actor

```text
Actors/Dialogue/TwoActor
Actors/Dialogue/ThreeActor
Actors/Dialogue/SpeakerListenerSwitch
Actors/Dialogue/GazeGraphDebug
```

### Materials

```text
Materials/Water/Calm
Materials/Water/Current
Materials/Water/Storm
Materials/Water/Underwater
Materials/Rigging/VesselDriven
Materials/Cloth/SecondaryLag
Materials/Reeds/FieldVariation
```

### World

```text
World/DepthCards/Basic
World/Camera/Dolly
World/Camera/Parallax
World/Eridu/Early
World/Eridu/Mature
World/Dilmun/Barren
World/Dilmun/Watered
World/Dilmun/Cultivated
```

### Physics

```text
Physics/Boat/Neutral
Physics/Boat/Roll
Physics/Hail/Small
Physics/Hail/Large
Physics/Hail/StormSequence
Physics/Debug/BodyBounds
```

### Crowds

```text
Crowds/CanalCrew/One
Crowds/CanalCrew/Twenty
Crowds/CanalCrew/OneHundred
Crowds/CanalCrew/DifferentSeed
Crowds/CanalCrew/Negative/Synchronized
```

### Animals

```text
Animals/Ox/Walk
Animals/Sheep/Graze
Animals/Herd/Twenty
Animals/Procession/MixedSpecies
Animals/Procession/Negative/CloneSync
```

### Montage

```text
Montage/Journey/ThreeSegments
Montage/Journey/LongContinuity
Montage/CityGrowth
```

## 7. Storybook controls

Every animation story exposes, where applicable:

```text
fixture ID
proof state
frame
fps
seed
runtime backend
resolution profile
camera debug
anchor/pivot debug
mesh bounds
source overlay
provenance panel
QA overlays
```

Playback is optional and never the only way to inspect behavior.

## 8. Unit test catalog

### `animation-frame`

- integer frame conversion;
- clip-local frame;
- progress;
- semantic seed derivation;
- stable scheduling;
- interpolation/easing boundaries.

### `animation-contracts`

- Scene V3 schema;
- runtime registry;
- runtime capability declaration;
- resolved scene immutability;
- V2 compatibility.

### `historical-sources`

- ETCSL identifiers;
- non-ETCSL classification;
- adaptation classes;
- visual evidence metadata;
- fictional bridge allowance;
- invalid authority claims rejected.

### `animation-rive`

- explicit frame advancement;
- state input mapping;
- actor channel composition;
- asset/version binding;
- no autonomous ticker in render mode.

### `animation-pixi`

- mesh bounds;
- deterministic vertex state;
- rope anchor;
- material channel independence;
- ticker disabled/manual.

### `animation-three`

- scene graph transforms;
- depth placement;
- camera evaluation;
- billboard rules;
- resolved asset mapping.

### `animation-physics`

- fixed timestep;
- body/joint order;
- repeated bake hash;
- collision event schedule;
- snapshot serialization.

### `animation-crowd`

- role count;
- phase distribution;
- path assignment;
- synchronization score;
- stable seed behavior.

### `animation-world`

- city profile validity;
- world-state transitions;
- water network graph;
- industry activation;
- deterministic placement.

## 9. Visual golden catalog

Goldens are exact-frame screenshots, not long videos.

Initial required goldens:

```text
Enki OPEN
Enki CLOSED
Enki RETURNED_OPEN
Enki HELM_GESTURE_PEAK
Water CALM
Water STORM
Rigging RESPONSE_PEAK
Stag DEPTH_CAMERA_PEAK
Kutu HAIL_IMPACT
CanalCrew WORK_PEAK
Herd PROCESSION_PEAK
City EARLY
City MATURE
```

Golden environment:

- pinned Linux;
- pinned Chromium;
- pinned device scale;
- pinned viewport;
- pinned fonts;
- pinned runtime versions.

Firefox/WebKit do not author goldens.

## 10. Rendered motion-proof catalog

Each proof is intentionally short.

```text
enki-blink          ~1–2 sec
hero-breath         ~3 sec
enki-helm-gesture   ~3 sec
water-current       ~3 sec
rigging-response    ~3 sec
stag-spatial        ~4 sec
hail-impact         ~4 sec
canal-crew-cycle    ~4 sec
herd-procession     ~4 sec
city-transition     ~5 sec
```

Proof output includes:

- MP4/webm as local artifact;
- extracted proof frames;
- JSON receipt;
- source/runtime hashes;
- deterministic metrics;
- semantic verdict when applicable.

## 11. E2E fixture catalog

### Historical source workflow

```text
open scene
view manuscript binding
view ETCSL/non-ETCSL classification
view visual evidence
edit adaptation classification
save
reload
verify persistence
```

### Actor workflow

```text
open actor inspector
select clip
scrub CLOSED/PEAK state
preview
create proof receipt
reject/promote depending fixture
reload
```

### Scene V3 workflow

```text
load scene
switch V2 compatibility/V3 preview
scrub exact frame
inspect resolved assets
render short proof
verify receipt appears
```

### City workflow

```text
load city preset
change development state
change seed
verify deterministic repeat
save/reload
```

### Promotion workflow

```text
candidate staged
review evidence
reject => canonical unchanged
approve => exact hash promoted
reload => promoted revision resolved
```

## 12. E2E mocking policy

External expensive systems should be deterministic fixtures in ordinary E2E:

- ComfyUI mocked or fixture-backed;
- Ollama/Qwen response fixture-backed;
- Rive/Pixi/Three runtimes real when browser-feasible;
- Rapier real for compact deterministic scenarios;
- no network museum/ETCSL fetch during E2E.

Dedicated integration tests may exercise live local services separately.

## 13. Fixture provenance

Any fixture that depicts historical-fiction content should declare:

```text
manuscript chapter/section
narrative revision
literary source bindings
visual evidence bindings
adaptation class
```

Synthetic geometry/math fixtures do not need historical provenance.

## 14. Fixture versioning

If only expected pixel rendering changes because of an intentional visual update:

- increment visual fixture revision;
- retain semantic fixture identity when meaning is unchanged.

If meaning changes:

- new fixture ID/version;
- update ADR/benchmark if architecture expectation changes.

## 15. Anti-fixture rules

Do not create fixtures that:

- depend on `tmp/` output from a developer machine;
- rely on mutable external URLs;
- contain unseeded randomness;
- are so large they make unit/Storybook loops impractical;
- silently bake proprietary assets that should not be committed;
- mark a known bad output as golden merely to make CI green.

## 16. Acceptance rule

A runtime feature is not considered test-complete until its fixture set supports all applicable layers:

```text
unit
Storybook
visual golden
motion proof
E2E workflow
negative rejection
```

Human review is added when visual quality/semantics matter.

# Scene V3 Worked Example — Enki at the Helm

Status: **planning example; not executable schema yet**

This document pressure-tests the planned Scene V3 contracts using the first combined benchmark we expect to matter in production: Enki aboard the Stag of the Absu. The purpose is to expose missing ownership or traceability fields before Phase 2 freezes TypeScript interfaces.

## 1. Narrative intent

The shot communicates calm competence and forward travel. Enki is not performing a large theatrical action. He is alive in the frame: breathing, looking ahead, making a small helm/tiller adjustment while the vessel, rigging and water move independently but coherently.

Target level: **Level 2 initially, Level 3 once spatial camera/world placement is enabled**.

Narrative requirements:

- preserve the approved editorial identity of Enki and the vessel;
- visible but restrained hero performance;
- independent vessel/material/environment channels;
- source-faithful painterly look;
- no runtime owns the production clock;
- shot must be comparable to the approved V2/L1 baseline.

## 2. Example authoring object

Conceptual only:

```ts
const enkiHelmScene: SceneV3 = {
  schemaVersion: '3',
  id: 'scene:ch01:r01:s03',
  revision: 1,

  story: {
    manuscriptId: 'manuscript:blessings-of-sumer',
    manuscriptRevision: 1,
    chapterId: 'ch01',
    narrativeThreadId: 'thread:ch01:enki-voyage',
    beat: 'TRAVEL',
    adaptation: 'composite-adaptation',
  },

  historicalSourceIds: [
    'lit:etcsl:enki-journey-nibru',
    'lit:etcsl:enki-world-order',
  ],

  visualEvidenceIds: [
    'visual:boat:mesopotamia-context-v1',
  ],

  fps: 30,
  durationFrames: 210,
  width: 1080,
  height: 1920,
  seed: 31003,

  camera: [{
    id: 'camera:main',
    runtime: '2d',
    projection: 'orthographic',
    trackId: 'track:camera:drift',
  }],

  actors: [{
    id: 'actor-instance:enki:s03',
    actorDefinitionId: 'actor:enki',
    runtime: 'rive',
    rigAsset: { id: 'asset:enki:rig', revision: 1 },
    transform: {
      position: { x: 0, y: 0, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      parentId: 'prop:stag-of-absu',
    },
  }],

  props: [{
    id: 'prop:stag-of-absu',
    runtime: 'layered-v2',
    asset: { id: 'asset:stag:vessel', revision: 1 },
  }],

  performances: [
    {
      id: 'perf:enki:breath',
      targetId: 'actor-instance:enki:s03',
      clipId: 'clip:enki:breathe-calm:v1',
      startFrame: 0,
      endFrame: 210,
      blendMode: 'additive',
    },
    {
      id: 'perf:enki:blink',
      targetId: 'actor-instance:enki:s03',
      clipId: 'clip:enki:blink-natural:v1',
      startFrame: 92,
      endFrame: 110,
      blendMode: 'weighted',
    },
    {
      id: 'perf:enki:gaze',
      targetId: 'actor-instance:enki:s03',
      clipId: 'clip:enki:gaze-forward-right:v1',
      startFrame: 40,
      endFrame: 150,
    },
    {
      id: 'perf:enki:helm-adjust',
      targetId: 'actor-instance:enki:s03',
      clipId: 'clip:enki:helm-adjust-small:v1',
      startFrame: 118,
      endFrame: 178,
    },
  ],

  materials: [
    {
      id: 'material:water:s03',
      runtime: 'pixi',
      targetId: 'environment:gulf-water',
      definitionId: 'material:water:gulf-calm:v1',
    },
    {
      id: 'material:rigging:s03',
      runtime: 'pixi',
      targetId: 'prop:stag-rigging',
      definitionId: 'material:rigging:reed-rope:v1',
      drivers: [{
        driverId: 'driver:rigging:vessel-lag:v1',
        sourceTargetId: 'prop:stag-of-absu',
        sourceChannel: 'rotation.z',
      }],
    },
  ],

  environments: [{
    id: 'environment:gulf-water',
    runtime: 'pixi',
    definitionId: 'environment:gulf-water:v1',
  }],

  simulations: [],
  crowds: [],
  herds: [],
  worldStates: [],

  qa: {
    benchmarkFixtureIds: ['benchmark:enki-helm:v1'],
    requiredInvariants: [
      'identity:enki',
      'contact:enki-tiller',
      'motion:independent-channels',
      'motion:rigging-causal-lag',
      'artifact:no-debug-leak',
      'source:editorial-fidelity',
    ],
    humanReviewRequired: true,
  },
};
```

## 3. Ownership check

This example intentionally separates responsibilities:

```text
Scene V3        timing, intent, IDs, clips, drivers, QA
Rive            Enki local facial/body deformation
Pixi            water/rigging local material deformation
Layered/V2      vessel source asset initially
Three/R3F       future Level 3 spatial placement/camera
Remotion        frame/render authority
QA              independent evidence over final rendered output
```

No transform should be owned twice. If Level 3 moves the vessel into Three/R3F, the vessel root transform moves to the spatial runtime while Rive remains local to Enki and Pixi material state remains local to rigging/water.

## 4. Semantic seed examples

```text
seed(scene=31003, target=enki, channel=blink, purpose=timing)
seed(scene=31003, target=enki, channel=breath, purpose=phase)
seed(scene=31003, target=rigging, channel=sway, purpose=phase)
seed(scene=31003, target=water, channel=ripple, purpose=phase)
```

Adding a new gull, reed or debug overlay must not change any of those values.

## 5. Named proof states

The benchmark fixture should expose exact frames shared by every test layer:

```text
START              frame 0
BREATH_VISIBLE     frame 55
BLINK_CLOSING      frame 96
BLINK_CLOSED       frame 101
BLINK_RETURNED     frame 111
HELM_GESTURE_PEAK  frame 151
RIGGING_LAG_PEAK   frame 165
END_SETTLED        frame 209
```

Frame numbers remain fixture data, not duplicated literals in Storybook, Playwright and render scripts.

## 6. Required controls

```text
BASELINE_V2
CHARACTER_FROZEN
MATERIAL_FROZEN
VESSEL_FROZEN
CAMERA_FROZEN
BLINK_DISABLED
RIGGING_DISABLED
```

These isolate contribution and prevent camera motion from hiding absent subject motion.

## 7. Unit/contract tests

- Scene validates and all semantic IDs are unique;
- actor parent exists;
- performance ranges are within scene bounds;
- Rive runtime declares facial-performance capability;
- Pixi runtime declares 2d-mesh/material capability;
- blink semantic seed is stable;
- adding unrelated material does not perturb blink seed;
- driver source/target exist;
- no transform ownership conflict;
- required proof states resolve to valid frames;
- debug asset reference is rejected in production mode.

## 8. Storybook stories

```text
Benchmarks/EnkiHelm/Overview
Benchmarks/EnkiHelm/Start
Benchmarks/EnkiHelm/BlinkClosed
Benchmarks/EnkiHelm/HelmGesturePeak
Benchmarks/EnkiHelm/RiggingLagPeak
Benchmarks/EnkiHelm/NormalSpeed
Benchmarks/EnkiHelm/Controls
Benchmarks/EnkiHelm/Debug
```

Stories use the same Scene V3 + benchmark fixture as Remotion.

## 9. Fixed-frame visual checks

Golden candidate frames:

- START;
- BLINK_CLOSED;
- HELM_GESTURE_PEAK;
- RIGGING_LAG_PEAK;
- END_SETTLED.

Goldens confirm image state, not motion quality.

## 10. Motion proof

Short proof should include the action window surrounding blink + helm adjustment and at least one control render.

Required deterministic checks:

- visible non-camera actor contribution;
- blink has close/closed/reopen sequence;
- no cyan/debug mask leakage;
- vessel contribution exists;
- rigging response lags vessel rather than running unrelated oscillator;
- tiller/hand contact remains within tolerance;
- no discontinuous pop at clip boundaries.

Semantic QA asks whether the final rendered sequence reads as a natural blink and restrained helm interaction. Human review remains final.

## 11. E2E flows

- load benchmark by fixture ID;
- select BLINK_CLOSED proof state and verify frame 101;
- inspect Enki rig/runtime/asset hash;
- toggle CHARACTER_FROZEN and confirm control mode;
- run/read proof status;
- inspect provenance tab;
- reject candidate and confirm canonical unchanged;
- later promote an approved fixture and reload exact revision.

## 12. Level 3 extension

The same logical scene should evolve without rewriting actor intent:

```text
V2 layered vessel root
    ↓
Three/R3F spatial vessel root

2D camera
    ↓
Three perspective/orthographic spatial camera
```

Enki performance clip IDs should remain stable unless the rig/performance contract genuinely changes.

## 13. Definition of example success

This paper example is successful if Phase 2 contracts can represent it without engine-specific leakage into the top-level schema, every important input can be resolved/checksummed, every named proof state can be tested consistently, and future Level 3 spatial ownership can be introduced without invalidating the narrative/performance intent.

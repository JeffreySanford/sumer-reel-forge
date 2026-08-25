# Level 2 Specification — Living Illustration

Status: **planning contract**

Level 2 is the stage where an approved illustration becomes visibly alive without requiring a fully spatial world reconstruction.

It is not "more moving layers." It is a reusable 2D/2.5D performance system with explicit rigs, material deformation, constraints, deterministic frame evaluation, QA, Storybook coverage and human review.

## 1. Definition

**Level 2 — Living Illustration** means:

- source-faithful 2D or 2.5D art remains visually dominant;
- characters can articulate meaningfully;
- faces can blink, gaze and express;
- body parts can move through parent/child rigs;
- cloth, hair, reeds, rigging and water can deform rather than only translate;
- multiple motion channels may overlap without sharing one oscillator;
- motion is driven from Scene V3/Remotion frame time;
- no subsystem owns an autonomous production clock;
- no hidden/unapproved geometry is revealed;
- every reusable primitive has unit, Storybook and rendered-motion coverage.

## 2. Level 2 boundary

Level 2 may:

- deform visible source artwork;
- reveal a small, explicitly prepared replacement state such as a closed eyelid or mouth shape;
- rotate/translate articulated pieces around approved pivots;
- bend meshes representing visible cloth, hair, water, reeds, ropes or skin;
- use source-preserving repair layers to cover gaps created by articulation;
- use depth/parallax and restrained perspective effects.

Level 2 should not:

- freely orbit behind a character or building;
- invent large unseen surfaces;
- simulate an entire spatial city;
- use uncontrolled I2V as the core motion engine;
- silently repaint identity-critical facial regions;
- let AI semantic QA substitute for actual rendered proof.

Those belong to Level 3 or to explicit asset-authoring stages.

## 3. Primary technologies

### Rive — hero character performance

Rive is the preferred Level 2 hero-character runtime.

Official references:

- https://rive.app/runtimes
- https://www.rive.app/blog/intro-to-meshes

Rive supports skeletal animation, constraints, raster meshes and mesh-to-bone weighting. The runtime is designed to allow code-level control, which makes it suitable for a frame-authoritative Remotion host.

Planned responsibilities:

```text
face
  blink
  gaze
  brows
  mouth states
  expression

body
  breathing
  head angle
  torso
  shoulders
  arms
  hands

secondary
  robe
  hair
  jewelry
```

A Rive actor must not run from wall-clock playback in production. Scene V3 evaluates a known frame/time and explicitly advances or sets the rig to that state.

### PixiJS 8 — materials and local raster deformation

Official references:

- https://pixijs.com/8.x/guides/components/scene-objects/mesh
- https://pixijs.com/8.x/guides/components/filters

PixiJS v8 provides low-level meshes, `MeshPlane`, `MeshRope`, `PerspectiveMesh`, filters and displacement suitable for source-preserving local motion.

Planned responsibilities:

```text
water surfaces
underwater refraction
reeds
hair strands
cloth panels
ropes
boat rigging
flags
smoke layers
fire distortion
heat shimmer
localized divine glow
```

The Pixi ticker must not become production authority. Uniforms and vertices are evaluated from `FrameContext`.

## 4. Level 2 actor model

```ts
interface ActorDefinition {
  id: string;
  characterId: string;
  runtime: 'rive' | 'spine' | 'layered';
  rigAsset: string;
  sourceBinding: string;
  visualEvidence?: string[];
  identityVersion: string;
  availableClips: string[];
}

interface ActorPerformanceTrack {
  actorId: string;
  clips: PerformanceClipInstance[];
}
```

Actors are reusable across scenes. The shot does not own a one-off animation implementation if an actor behavior can be expressed as a performance clip.

## 5. Performance Clip Library

The project needs a canonical performance vocabulary.

```text
performances/
  idle/
    breathe-calm
    breathe-tired
    weight-shift

  face/
    blink-natural
    blink-slow
    glance-left
    glance-right
    concern
    smile-small
    anger
    disbelief

  dialogue/
    listening
    conversational
    formal-address
    proclamation
    argument
    reassurance

  body/
    sit
    stand
    turn
    walk
    point
    open-hand
    embrace
    helm-rest

  work/
    dig
    carry
    row
    steer
    hammer
    weave
```

A clip is not just a keyframe file. It has semantic and QA metadata:

```ts
interface PerformanceClipDefinition {
  id: string;
  durationFrames: number;
  looping: boolean;
  channels: string[];
  contacts?: ContactConstraint[];
  semanticIntent: string;
  requiredProofStates: string[];
  sourceSafeZones?: string[];
}
```

## 6. Character preparation pipeline

Hero actors should be prepared once rather than re-segmented per shot.

### Required actor package

```text
characters/enki/v1/
  source/
    canonical-reference.png
  rig/
    enki-v1.riv
  masks/
    face.png
    eyes.png
    hair.png
    robe.png
  evidence/
    source-binding.json
    visual-evidence.json
    rig-review.json
  tests/
    proof-frames.json
```

### Preparation stages

1. select canonical source art;
2. bind narrative identity/version;
3. segment only what the rig actually needs;
4. clean transparent edges;
5. define pivots/bones/mesh contours;
6. define contact points;
7. author neutral pose;
8. author minimal performance clips;
9. Storybook-review each state;
10. render motion proofs;
11. human approve the rig version;
12. lock checksums before production use.

## 7. Face performance standard

The Shot 3 blink investigation becomes a permanent design constraint.

A blink is not accepted because pixels changed.

A `blink-natural` clip must prove:

```text
OPEN
CLOSING
CLOSED
OPENING
OPEN
```

Required gates:

- both eyes registered to actual eye geometry;
- eyes visibly close;
- iris/pupil/sclera not visible at closed peak unless deliberately stylized;
- no debug/mask color leakage;
- left/right timing coherent;
- no face identity drift;
- no rectangular patch appearance;
- clean return to original open state;
- normal-speed human review reads as a blink without frame hunting.

The cyan-eye Shot 3 failure becomes a regression fixture for the animation QA package.

## 8. Material motion standard

Materials must declare a physical/visual model instead of generic "sway."

Example:

```ts
interface MaterialMotionDefinition {
  id: string;
  type: 'water' | 'cloth' | 'rope' | 'reeds' | 'hair' | 'smoke';
  driver: DriverDefinition;
  response: ResponseDefinition;
  bounds: MotionBounds;
  anchor?: string;
  lagSeconds?: number;
  seed?: number;
}
```

### Causality rules

A secondary layer should identify its driver:

```text
boat roll
    ↓
rigging tension
    ↓
lagged rope response
```

not:

```text
boat = sin(t)
rope = unrelated sin(t)
```

The existing Shot 3 rigging causality work remains a valid Level 2 concept and should migrate into the generic material runtime.

## 9. Level 2 composition rules

Every Level 2 shot must define independently timed channels from these categories:

- camera;
- rigid object;
- character body;
- face/performance;
- secondary character material;
- environmental material;
- particles/atmosphere.

A hero Level 2 benchmark should normally contain at least four meaningful non-camera channels when the source supports them.

## 10. `FrameContext`

All Level 2 adapters evaluate from the same frame contract:

```ts
interface FrameContext {
  frame: number;
  fps: number;
  timeSeconds: number;
  progress: number;
  seed: number;
  sceneId: string;
  shotId: string;
  mode: 'preview' | 'storybook' | 'render' | 'qa';
}
```

The same frame/seed/scene must produce the same intended state regardless of whether it is evaluated in Storybook, a proof render or the final reel.

## 11. Storybook requirements

Every Level 2 primitive must have stories.

### Actor examples

```text
Actors/Enki
  Neutral
  Blink
  GazeLeft
  GazeRight
  Breath
  HelmGesture
  BlinkAndGaze
  StressRapidScrub
```

### Material examples

```text
Materials/Water
  Calm
  Current
  Storm
  Underwater

Materials/Rigging
  Still
  VesselDriven
  LaggedResponse
  FrozenDriverControl
```

Each story gets standardized controls:

```text
frame
fps
seed
debug overlays
QA overlays
resolution
runtime backend
```

Playback is useful for review, but **fixed-frame mode is the default test state**.

## 12. Canonical Storybook proof states

Every animated primitive exposes five named states:

```text
START
ANTICIPATION
PEAK
SETTLE
END
```

A blink specializes them as:

```text
OPEN
CLOSING
CLOSED
OPENING
OPEN
```

A boat roll specializes them as:

```text
NEUTRAL
ROLL_LEFT
CENTER
ROLL_RIGHT
SETTLE
```

These states become screenshot/visual-test targets.

## 13. Unit test requirements

Level 2 unit tests cover:

- frame/time conversion;
- clip interpolation;
- channel composition;
- deterministic seed behavior;
- pivots and coordinate transforms;
- mesh-bound calculations;
- contact constraints;
- material-driver causality;
- lag/inertia math;
- parent-child transforms;
- identity/source checksum contracts;
- proof-state generation;
- promotion policy.

Pure math/runtime tests should remain fast and headless.

## 14. Rendered motion proofs

Storybook screenshots do not prove temporal behavior.

Every production animation primitive needs a short rendered proof, for example:

```text
blink-proof.mp4        30 frames
arm-gesture-proof.mp4  60 frames
water-proof.mp4        90 frames
rigging-proof.mp4      90 frames
```

Rendered proof verifies:

- expected motion exists;
- expected region moves;
- unrelated region remains stable;
- motion is visible for enough frames;
- no one-frame pop;
- no alpha/debug artifact leakage;
- return/settling is correct;
- source identity remains acceptable.

## 15. Semantic QA

Qwen or another vision critic may evaluate semantic questions:

- are the eyes actually closed?
- is Enki still Enki?
- does a hand remain on the tiller?
- does a gesture read as pointing?
- does an embrace maintain contact?
- does water still look like water?

Semantic QA is independent evidence, never sole approval.

## 16. Human review

Level 2 human review is always normal-speed first.

Frame-by-frame review is diagnostic, not a substitute for perception.

A Level 2 shot fails if the human reviewer must be told where to look for the intended motion.

## 17. Level 2 benchmark set

Before migrating Reel 1 broadly, Level 2 must prove:

1. **Enki blink/gaze/breath** — unmistakable facial performance.
2. **Enki helm articulation** — arm/body/hand contact with tiller.
3. **Enlil formal address** — reusable speech/gesture performance.
4. **Two-actor conversation** — gaze/listening/reaction without identity drift.
5. **Water + rigging + cloth** — independent but causally coherent material channels.
6. **Worker loop** — reusable non-hero work performance ready for Level 3 crowds.

## 18. Level 2 Definition of Done

The Level 2 platform is complete only when:

- hero actor can blink naturally;
- hero actor can gaze;
- hero actor can breathe;
- hero actor can perform meaningful arm/torso articulation;
- two actors can interact;
- cloth/hair can deform;
- water can move as material, not only translate;
- rigging responds causally;
- every primitive is deterministic by frame/seed;
- every primitive has unit tests;
- every primitive has Storybook fixed-frame stories;
- every primitive has rendered-motion proof;
- artifact-leak regression includes the Shot 3 cyan-eye failure;
- source/provenance is preserved;
- human review shows a clear improvement over Level 1.

Level 2 completion is a platform gate. It is not declared because one Reel 1 shot looks better.

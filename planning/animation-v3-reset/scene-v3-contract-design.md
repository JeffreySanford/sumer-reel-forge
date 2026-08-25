# Scene V3 Contract Design

Status: **planning contract**

This document turns the Level 3 architecture into a concrete contract plan before implementation begins.

## 1. Design goals

Scene V3 must be:

- deterministic;
- inspectable;
- serializable;
- versioned;
- source-aware;
- runtime-agnostic at the top level;
- specific enough to expose engine-specific capability where needed;
- backwards-compatible with Scene V2 through an explicit adapter;
- testable without rendering a full video.

Scene V3 is not an attempt to normalize every animation engine into one lowest-common-denominator API.

## 2. Top-level schema

Conceptual contract:

```ts
interface SceneV3 {
  schemaVersion: '3';
  id: string;
  title: string;

  story: StoryBinding;
  historicalSources: HistoricalSourceBinding[];
  visualEvidence: VisualEvidenceBinding[];

  frame: SceneFrameDefinition;
  seed: number;

  camera: CameraDefinition;
  actors: ActorInstance[];
  props: PropInstance[];
  environments: EnvironmentInstance[];
  materials: MaterialInstance[];
  effects: EffectInstance[];
  crowds: CrowdDefinition[];
  simulations: SimulationBinding[];
  tracks: SceneTrack[];

  world?: WorldDefinitionBinding;
  montage?: MontageDefinition;

  qa: SceneQaContract;
  provenance: ProvenanceContract;
}
```

## 3. Scene frame definition

```ts
interface SceneFrameDefinition {
  fps: number;
  durationFrames: number;
  width: number;
  height: number;
  pixelAspectRatio?: number;
}
```

Production vertical default remains 1080x1920 @ 30fps unless a composition explicitly declares otherwise.

Frame rate is part of scene semantics. Runtime adapters may not substitute a different rate silently.

## 4. FrameContext

```ts
interface FrameContext {
  frame: number;
  fps: number;
  durationFrames: number;
  timeSeconds: number;
  progress: number;

  sceneSeed: number;
  deterministicSeed: number;

  sceneId: string;
  shotId?: string;

  mode: 'preview' | 'storybook' | 'render' | 'qa';
}
```

`deterministicSeed` is derived from stable identifiers rather than consumption order, so adding an unrelated random channel does not perturb every downstream animation.

Recommended derivation concept:

```text
hash(sceneSeed, targetId, channelId, semanticPurpose)
```

Never use one mutable global PRNG stream for an entire scene.

## 5. Time representation

Canonical time representation is integer frame.

Seconds and normalized progress are derived values.

Avoid persisted floating-point timestamps where an integer frame can express the same intent.

Examples:

```ts
startFrame: 42
endFrame: 68
```

not:

```ts
startSeconds: 1.4
endSeconds: 2.2666667
```

## 6. Runtime reference

```ts
type RuntimeType =
  | 'layered-v2'
  | 'rive'
  | 'pixi'
  | 'three'
  | 'rapier-baked'
  | 'spine'
  | 'crowd'
  | 'city'
  | 'montage'
  | 'generative-baked';

interface RuntimeReference {
  runtime: RuntimeType;
  runtimeVersion?: string;
  definitionId: string;
}
```

Runtime version may be resolved from the build manifest but must appear in evidence.

## 7. Actor definition vs actor instance

Reusable character identity is separate from scene placement.

```ts
interface ActorDefinition {
  id: string;
  displayName: string;
  runtime: 'rive' | 'spine' | 'layered-v2';
  rigAssetId: string;
  sourceAssetIds: string[];
  performanceCapabilities: string[];
  provenance: AssetProvenance;
}

interface ActorInstance {
  id: string;
  actorDefinitionId: string;
  transform: TransformDefinition;
  depthMode: '2d' | 'card' | 'mesh' | 'hybrid';
  facing?: number;
  performanceBindings: PerformanceBinding[];
}
```

This enables one approved Enki rig to appear in many scenes without copying its identity contract.

## 8. Performance tracks

```ts
interface PerformanceBinding {
  channel: string;
  clipId: string;
  startFrame: number;
  endFrame: number;
  weight?: TrackValue<number>;
  parameters?: Record<string, TrackValue<unknown>>;
  blendMode?: 'replace' | 'additive' | 'weighted';
}
```

Examples:

```text
face.blink
face.gaze
body.breath
body.armLeft
body.turn
speech.formalAddress
```

Performance channels must be semantically named rather than tied directly to engine-specific object IDs.

Runtime adapters translate semantic channels to rig internals.

## 9. Performance clip contract

```ts
interface PerformanceClip {
  id: string;
  actorClass: string;
  semanticAction: string;
  durationFrames: number;
  loop: boolean;
  channels: string[];
  keyStates: AnimationKeyState[];
  qa: PerformanceQaContract;
}
```

Every production clip declares named key states used for Storybook and visual regression.

## 10. Track values

Scene V3 should support a small set of deterministic track primitives:

```ts
type TrackValue<T> =
  | ConstantValue<T>
  | KeyframeTrack<T>
  | ExpressionBinding<T>
  | DriverBinding<T>;
```

Avoid an unrestricted JavaScript expression language inside scene JSON.

If custom math is required, it belongs in a named tested driver implementation.

## 11. Keyframe track

```ts
interface Keyframe<T> {
  frame: number;
  value: T;
  easing?: EasingId;
}

interface KeyframeTrack<T> {
  type: 'keyframes';
  keyframes: Keyframe<T>[];
}
```

Easing IDs are registered names with unit tests.

## 12. Driver binding

Drivers encode causal relationships:

```ts
interface DriverBinding<T> {
  type: 'driver';
  driverId: string;
  sourceTargetId: string;
  sourceChannel: string;
  parameters: Record<string, unknown>;
}
```

Examples:

```text
vessel roll → rigging lag
wind → reed sway
boat acceleration → hanging ornament
camera depth → billboard scale correction
```

Drivers are preferable to copying the same oscillator parameters into unrelated objects.

## 13. Transform definition

```ts
interface TransformDefinition {
  position: Vec3Track;
  rotation: Vec3Track;
  scale: Vec3Track;
  pivot?: Vec3;
  parentId?: string;
}
```

Level 2 may use X/Y with Z as depth ordering. Level 3 uses full spatial transforms.

Parent-child relationships are explicit and tested for cycles.

## 14. Material instance

```ts
interface MaterialInstance {
  id: string;
  runtime: 'pixi' | 'three' | 'layered-v2';
  targetId: string;
  materialDefinitionId: string;
  parameters: Record<string, TrackValue<unknown>>;
  containment?: ContainmentDefinition;
}
```

Material animation is separate from actor performance even when both affect the same visual object.

## 15. Camera contract

```ts
interface CameraDefinition {
  runtime: '2d' | 'three';
  transform: TransformDefinition;
  projection: 'orthographic' | 'perspective';
  focalLength?: TrackValue<number>;
  fieldOfView?: TrackValue<number>;
  focusTargetId?: string;
  safeZones: CameraSafeZone[];
}
```

Camera does not get to hide subject-animation insufficiency in QA.

Subject-motion proofs should be able to evaluate with the camera contribution removed or controlled.

## 16. Environment contract

```ts
interface EnvironmentInstance {
  id: string;
  definitionId: string;
  runtime: 'three' | 'pixi' | 'layered-v2';
  transform?: TransformDefinition;
  stateBindings?: WorldStateBinding[];
}
```

Examples:

- water surface;
- reed bed;
- temple interior;
- city district;
- mountain horizon;
- storm system.

## 17. World definitions

A world definition contains persistent reusable environment data.

```ts
interface WorldDefinition {
  id: string;
  geography: GeographyDefinition;
  cities: CityDefinition[];
  routes: RouteDefinition[];
  waterSystems: WaterSystemDefinition[];
  evidence: VisualEvidenceBinding[];
}
```

A scene binds to a subset/state of the world rather than regenerating a city from prompts.

## 18. City development states

```ts
interface CityDevelopmentState {
  id: string;
  ordinal: number;
  enabledFeatures: string[];
  populationScale: number;
  buildingDensity: number;
  agricultureScale: number;
  industryScale: number;
}
```

Transitions between states are authored tracks or montage segments, not arbitrary procedural mutation during render.

## 19. Crowd contract

```ts
interface CrowdDefinition {
  id: string;
  runtime: 'crowd';
  actorPool: string[];
  count: number;
  seed: number;
  regionId: string;
  behaviorId: string;
  densityRules: CrowdDensityRule[];
  variation: CrowdVariationDefinition;
}
```

Agent identity is deterministic by index + seed.

Crowd generation must not depend on iteration order from browser object maps or nondeterministic async resolution.

## 20. Herd contract

```ts
interface HerdDefinition {
  id: string;
  species: string;
  count: number;
  rigPool: string[];
  seed: number;
  pathId?: string;
  regionId?: string;
  behavior: 'graze' | 'walk' | 'procession' | 'rest' | 'scatter';
}
```

## 21. Physics binding

```ts
interface SimulationBinding {
  id: string;
  engine: 'rapier';
  mode: 'baked';
  definitionAssetId: string;
  bakeAssetId: string;
  timestep: number;
  frameCount: number;
  receiptHash: string;
}
```

Production Scene V3 does not run an unverified live physics simulation by default.

## 22. Generative bake binding

```ts
interface GenerativeBakeBinding {
  id: string;
  sourceAssetIds: string[];
  outputAssetId: string;
  workflowHash: string;
  model: string;
  modelVersion?: string;
  seed: number;
  promptHash: string;
  humanReviewed: boolean;
}
```

Generative output is treated as an asset with provenance, not an invisible runtime effect.

## 23. Historical/source binding placement

Scene-level source bindings establish broad provenance.

Specific actor/prop/environment assets may have additional visual-evidence bindings.

A shot can therefore say:

```text
Narrative origin:
  ETCSL Enki's Journey to Nibru

Boat appearance:
  archaeological analog / reconstruction evidence

Dialogue connective material:
  fictional bridge
```

These layers are intentionally separate.

## 24. QA contract

```ts
interface SceneQaContract {
  requiredInvariants: QaInvariantId[];
  benchmarkStates: AnimationKeyState[];
  semanticActions: SemanticActionExpectation[];
  renderProofs: RenderProofDefinition[];
  humanReviewRequired: boolean;
}
```

QA expectations live with intent, not only in test implementation code.

## 25. Evidence receipt

```ts
interface SceneRenderReceipt {
  sceneId: string;
  sceneHash: string;
  commitSha: string;
  runtimeVersions: Record<string, string>;
  sourceAssetHashes: Record<string, string>;
  simulationHashes: Record<string, string>;
  renderedFileHash: string;
  proofResults: ProofResult[];
  semanticReview?: SemanticReviewResult;
  humanReview?: HumanReviewResult;
}
```

The receipt must identify what was actually rendered, not only what was requested.

## 26. Compatibility adapter

Scene V2 remains valid.

```ts
interface SceneV2CompatibilityAdapter {
  validateV2(scene: SceneV2): ValidationResult;
  resolve(scene: SceneV2): SceneV3;
  produceCompatibilityReceipt(scene: SceneV2, resolved: SceneV3): CompatibilityReceipt;
}
```

Compatibility requirements:

- same fps;
- same duration;
- same source-start timing;
- same canonical asset hashes;
- same captions/title behavior;
- no extra motion channels unless explicitly enabled.

## 27. Schema migration

Every Scene V3 JSON carries an explicit schema version.

Future migration pattern:

```text
v3.0 input
   ↓
validated migrator
   ↓
v3.1 canonical form
   ↓
migration receipt
```

Never silently reinterpret old scene files by changing runtime defaults.

## 28. Validation layers

Validation is split into:

1. structural schema validation;
2. referential validation;
3. timeline validation;
4. runtime capability validation;
5. source/provenance validation;
6. QA-contract validation.

A scene can be structurally valid but not production-ready.

## 29. Runtime capability declaration

Each runtime exposes capabilities:

```ts
interface RuntimeCapabilities {
  runtime: RuntimeType;
  supportsExactFrameSeek: boolean;
  supportsHeadlessRender: boolean;
  supportsStorybook: boolean;
  supportsSpatialPlacement: boolean;
  supportsDeterministicSeed: boolean;
  requiresGpu: boolean;
  requiresWasm: boolean;
}
```

Scene validation can reject an unsupported requested capability before render.

## 30. Scene state resolution

Production pipeline concept:

```text
Scene V3 source
    ↓
schema validation
    ↓
source/provenance resolution
    ↓
runtime capability resolution
    ↓
asset checksum resolution
    ↓
prepared production props
    ↓
write resolved-scene.json
    ↓
Remotion receives resolved props
    ↓
render
    ↓
verify resolved props + rendered evidence
```

The composition must not resolve a different candidate after QA.

## 31. Storybook projection

Every Scene V3 component must be evaluable at an explicit `FrameContext` without a production render.

Storybook gets:

```ts
createStoryFrameContext({
  frame: 101,
  fps: 30,
  seed: 12345,
  mode: 'storybook'
});
```

This creates identical semantic state to production evaluation for that frame.

## 32. Unit-test projection

Pure resolution functions should allow:

```ts
const resolved = evaluateScene(scene, {
  frame: 101,
  mode: 'qa'
});
```

Tests assert semantic state and transforms without necessarily creating pixels.

## 33. Non-goals

Scene V3 will not:

- contain arbitrary executable JavaScript from JSON;
- act as a general game engine;
- replace Rive/Three/Pixi-specific asset formats;
- store binary animation assets inline;
- permit runtime-controlled wall-clock timing;
- auto-promote assets;
- infer historical truth from visual generation.

## 34. Initial implementation sequence

1. `animation-contracts` — types and validation only;
2. `animation-frame` — FrameContext, deterministic seed derivation, easing registry;
3. fake runtime adapter registry;
4. resolved-scene contract;
5. Scene V2 compatibility adapter;
6. Storybook fixture adapter;
7. render receipt contract;
8. only then first real engine adapter.

## 35. Exit criteria

Scene V3 contract design is ready for implementation when:

- top-level schema ownership is accepted;
- frame/seed semantics are accepted;
- runtime adapter boundary is accepted;
- actor/performance distinction is accepted;
- material/world/physics ownership is accepted;
- resolved-scene production path is accepted;
- evidence receipt binds actual resolved runtime assets;
- Scene V2 compatibility rules are agreed;
- no unresolved second timeline authority remains.

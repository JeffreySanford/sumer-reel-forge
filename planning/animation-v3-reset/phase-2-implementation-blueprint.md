# Phase 2 Implementation Blueprint — Scene V3 Foundation

Status: **implementation design; no engine dependency required**

This document defines Phase 2 down to planned Nx libraries, file boundaries, interfaces, compiler stages, fixtures, tests, local commands and PR slices. The intent is to make Phase 2 executable without re-litigating architecture during coding.

## 1. Phase 2 objective

Build the engine-independent foundation that every Level 2/3 runtime must obey:

```text
Scene V3 authoring data
        ↓
validation
        ↓
source/asset/runtime resolution
        ↓
canonical resolved scene
        ↓
FrameContext + deterministic evaluation
        ↓
runtime adapter registry
        ↓
evidence-ready state
```

No Rive, Pixi, Three, Rapier or Spine dependency is required to exit Phase 2.

## 2. Planned Nx libraries

```text
libs/
  animation-contracts/
  animation-frame/
  animation-runtime/
  animation-scene/
  animation-fixtures/
```

Responsibilities:

- `animation-contracts` — versioned public data contracts and validators;
- `animation-frame` — canonical frame math, semantic seeding, easing/keyframe/event evaluation;
- `animation-runtime` — adapter lifecycle, capability declarations, registry and fake/failure adapters;
- `animation-scene` — Scene V3 compile/resolve/canonicalize/hash pipeline and V2 compatibility adapter;
- `animation-fixtures` — shared positive/negative fixtures consumed by unit, Storybook, visual and E2E tests.

## 3. Dependency direction

Allowed:

```text
historical-sources
        ↑
animation-contracts
        ↑
  ┌─────┼─────────────┐
  │     │             │
frame runtime      fixtures
  ↑     ↑             ↑
  └─────┴──── scene ──┘
```

More concretely:

- `animation-contracts` may depend on `historical-sources` types;
- `animation-frame` may depend on `animation-contracts` only where required;
- `animation-runtime` depends on contracts/frame;
- `animation-scene` depends on contracts/frame/runtime/historical-sources;
- `animation-fixtures` may depend on all foundation contract libraries but no real animation engines.

Forbidden:

- `historical-sources` depending on animation;
- contracts importing React/Angular/Remotion;
- frame kernel importing browser APIs;
- runtime registry importing concrete Rive/Pixi/Three dependencies in Phase 2.

## 4. `animation-contracts` planned files

```text
src/lib/
  scene-v3.ts
  story-binding.ts
  asset-ref.ts
  actor.ts
  performance.ts
  material.ts
  environment.ts
  camera.ts
  effect.ts
  simulation.ts
  crowd.ts
  herd.ts
  world-state.ts
  montage.ts
  qa.ts
  evidence.ts
  receipt.ts
  versioning.ts
  validation.ts
```

Public exports should be explicit from `src/index.ts`.

## 5. Core Scene V3 contract

Planned minimum:

```ts
export interface SceneV3 {
  schemaVersion: '3';
  id: SceneId;
  revision: number;

  story: StoryBinding;
  historicalSourceIds: HistoricalSourceId[];
  visualEvidenceIds: VisualEvidenceId[];

  fps: number;
  durationFrames: number;
  width: number;
  height: number;
  seed: number;

  camera: CameraTrack[];
  actors: ActorInstance[];
  props: PropInstance[];
  environments: EnvironmentInstance[];
  performances: PerformanceTrack[];
  materials: MaterialTrack[];
  effects: EffectTrack[];
  simulations: SimulationBinding[];
  crowds: CrowdDefinition[];
  herds: HerdDefinition[];
  worldStates: WorldStateTrack[];
  montage?: MontageDefinition;

  qa: SceneQaContract;
}
```

Rules:

- authoring Scene V3 contains stable IDs, not absolute machine paths;
- all frame bounds are integers;
- duration is positive;
- target IDs are unique within declared namespace;
- references are validated before resolution;
- source/evidence IDs resolve through registries.

## 6. Stable ID policy

Use branded/string types conceptually:

```ts
type SceneId = string;
type ActorId = string;
type AssetId = string;
type RuntimeId = string;
type PerformanceClipId = string;
type HistoricalSourceId = string;
```

Format convention:

```text
scene:ch01:r01:s03
actor:enki
asset:enki:editorial-body:v1
clip:enki:blink-natural:v1
material:water:gulf-calm:v1
runtime:rive:hero-character
```

IDs are semantic identity; paths are resolved implementation details.

## 7. `animation-frame` planned files

```text
src/lib/
  frame-context.ts
  frame-math.ts
  semantic-seed.ts
  deterministic-rng.ts
  easing.ts
  keyframe.ts
  interval.ts
  event-schedule.ts
  channel-driver.ts
  proof-state.ts
```

## 8. `FrameContext`

```ts
export interface FrameContext {
  readonly frame: number;
  readonly fps: number;
  readonly timeSeconds: number;
  readonly progress: number;
  readonly sceneId: SceneId;
  readonly shotId?: string;
  readonly sceneSeed: number;
  readonly mode: 'preview' | 'storybook' | 'render' | 'qa';
}
```

Factory only:

```ts
createFrameContext({ frame, fps, durationFrames, sceneId, seed, mode })
```

Do not allow callers to supply contradictory `timeSeconds` or `progress` values.

## 9. Semantic seed derivation

Planned API:

```ts
deriveSemanticSeed({
  sceneSeed,
  sceneId,
  targetId,
  channel,
  purpose,
  version: 1,
}): number
```

Properties required by tests:

1. same inputs -> same seed;
2. unrelated channel creation does not perturb existing channel seeds;
3. field ordering does not matter;
4. separators cannot cause ambiguous concatenation;
5. algorithm version is explicit;
6. output is stable across Node/browser environments.

Implementation may use a stable non-cryptographic hash over canonical UTF-8 fields; the exact algorithm becomes an ADR when selected.

## 10. Frame math rules

Canonical rules:

- persisted time coordinate is integer frame;
- scene valid range is `0 <= frame < durationFrames`;
- clip range is `[startFrame, endFrame)`;
- `timeSeconds = frame / fps`;
- scene progress for duration > 1 is `frame / (durationFrames - 1)` for display/interpolation contexts where endpoints both need 0/1;
- clip-local progress contract is separately named to avoid accidental use of scene progress;
- clamp behavior is explicit per helper.

Tests must cover 1-frame scenes, first/last frame, invalid negative frame, exact clip end, 23.976-like fps values if supported later, and 30 fps canonical production.

## 11. Easing registry

No arbitrary anonymous easing function may be serialized in Scene V3.

Use IDs:

```text
linear
smoothstep
smootherstep
ease-in-quad
ease-out-quad
ease-in-out-cubic
physical-lag-v1
```

Runtime-specific easing may exist behind namespaced IDs but must be resolvable/versioned.

## 12. `animation-runtime` planned files

```text
src/lib/
  runtime-types.ts
  capability.ts
  adapter.ts
  registry.ts
  prepare-context.ts
  evidence.ts
  fake-adapter.ts
  failure-adapter.ts
  unsupported-adapter.ts
```

## 13. Adapter lifecycle

```ts
export interface AnimationRuntimeAdapter<TDefinition, TPrepared> {
  readonly type: RuntimeType;
  readonly version: string;
  readonly capabilities: readonly RuntimeCapability[];

  validate(definition: TDefinition): ValidationResult;
  prepare(definition: TDefinition, ctx: PrepareContext): Promise<TPrepared>;
  evaluate(prepared: TPrepared, frame: FrameContext): RuntimeFrameState;
  collectEvidence(prepared: TPrepared, frame: FrameContext): RuntimeEvidence;
  dispose(prepared: TPrepared): void | Promise<void>;
}
```

Constraints:

- `evaluate()` has no wall-clock input;
- adapter cannot mutate Scene V3;
- adapter cannot promote assets;
- adapter cannot silently resolve a different asset;
- capability mismatch fails before render.

## 14. Runtime capability vocabulary

Initial capabilities:

```text
2d-transform
2d-mesh
skeletal-character
facial-performance
spatial-placement
spatial-camera
physics-playback
physics-authoring
crowd-evaluation
world-state
montage
generative-bake
```

Capabilities are descriptive gates, not an excuse for one universal mega-interface.

## 15. Fake adapter

The fake adapter is a production-quality test harness, not throwaway code.

It should support:

- deterministic position;
- deterministic opacity;
- parent-child transform;
- semantic channel seed;
- named proof states;
- evidence payload;
- intentional failure modes.

It becomes the first adapter rendered in Animation Lab Phase 3.

## 16. Failure adapter

Configurable failures:

```text
prepare throws
evaluate throws at frame N
returns nondeterministic value
capability missing
asset checksum mismatch
evidence unavailable
dispose failure
```

Used to prove diagnostics and resilience before real engines arrive.

## 17. `animation-scene` planned files

```text
src/lib/
  compile-scene-v3.ts
  validate-scene-v3.ts
  resolve-sources.ts
  resolve-assets.ts
  resolve-runtimes.ts
  resolve-capabilities.ts
  resolve-seeds.ts
  canonicalize.ts
  hash-resolved-scene.ts
  resolved-scene-v3.ts
  scene-compiler-report.ts
  scene-v2-compat.ts
```

## 18. Compiler stages

```text
AUTHORING SceneV3
      ↓
1 parse/schema validation
      ↓
2 semantic validation
      ↓
3 historical source/evidence resolution
      ↓
4 asset reference resolution
      ↓
5 runtime registration/version resolution
      ↓
6 capability validation
      ↓
7 deterministic semantic-seed resolution
      ↓
8 canonical ordering/serialization
      ↓
9 hash
      ↓
ResolvedSceneV3 + CompilerReport
```

No runtime rendering occurs here.

## 19. Resolved scene

Conceptual:

```ts
interface ResolvedSceneV3 {
  schemaVersion: '3';
  sourceSceneId: SceneId;
  sourceSceneRevision: number;
  sourceSceneHash: string;

  historicalSources: ResolvedHistoricalSource[];
  visualEvidence: ResolvedVisualEvidence[];
  assets: ResolvedAsset[];
  runtimes: ResolvedRuntime[];

  deterministicSeeds: ResolvedSeedBinding[];
  canonicalScene: CanonicalSceneData;
  resolvedHash: string;
}
```

The Remotion composition should eventually consume this resolved form rather than making late discretionary choices.

## 20. Canonical serialization

Required properties:

- deterministic key ordering;
- deterministic array ordering where semantics permit sorting;
- preserve authored ordering where order itself is meaningful;
- normalized path separators in logical paths;
- explicit runtime versions;
- no absolute workstation paths in canonical hash;
- canonical hash repeated identically on Windows and Linux.

Cross-platform hash equality becomes a GitHub Actions gate.

## 21. V2 compatibility adapter

Phase 2 builds the contract, not a broad Reel 1 migration.

Input:

```text
Scene V2 JSON + canonical V2 manifest
```

Output:

```text
SceneV3-compatible authoring/resolved representation
```

Required parity assertions:

- duration unchanged;
- sourceStart unchanged;
- canonical asset hashes unchanged;
- depth/layer order equivalent;
- existing optional layers represented explicitly;
- no new motion invented;
- V2 evidence receipt remains linked.

Primary fixture: current Shot 3 baseline, but migration stays read-only.

## 22. `animation-fixtures` planned structure

```text
src/lib/
  scenes/
    minimal-scene.ts
    actor-scene.ts
    parent-child-scene.ts
    source-bound-scene.ts
    v2-compat-shot03.ts
  proof-states/
    five-state.ts
    blink.ts
    boat.ts
  negative/
    duplicate-id.ts
    missing-runtime.ts
    missing-source.ts
    invalid-frame.ts
    cyclic-parent.ts
    checksum-mismatch.ts
    nondeterministic-adapter.ts
```

Fixture identity should be reusable by unit, Storybook, E2E and future render proofs.

## 23. Unit test inventory

### contracts

- valid minimal scene;
- schema version mismatch;
- duplicate IDs;
- missing referenced actor/asset;
- invalid frame ranges;
- unknown QA category;
- invalid montage boundaries.

### frame

- frame/time conversion;
- progress endpoints;
- semantic seed stability;
- unrelated channel isolation;
- easing endpoints;
- keyframe interpolation;
- interval semantics;
- stable event schedule.

### runtime

- registration;
- duplicate runtime registration rejected;
- capability validation;
- fake deterministic evaluate;
- failure adapter diagnostics;
- dispose invoked.

### scene compiler

- stage ordering;
- source resolution;
- asset resolution;
- runtime version binding;
- canonical serialization;
- hash repeatability;
- Windows/Linux logical path normalization;
- compiler warnings vs blocking errors.

### V2 compatibility

- duration parity;
- checksum parity;
- depth ordering parity;
- unknown V2 feature fails explicitly rather than silently dropping.

## 24. Lint rules to plan

Potential custom lint/validation rules, introduced only if simpler type/schema checks are insufficient:

- no runtime package imported by `animation-contracts`;
- no browser global in `animation-frame`;
- no `Math.random()` inside `libs/animation-*` production code;
- no `Date.now()`/wall-clock animation state;
- no unversioned runtime declaration;
- no direct canonical asset write from runtime adapter.

At minimum, unit/source scans must enforce the semantic rules until custom ESLint rules are justified.

## 25. Planned Nx targets

Each library:

```text
lint
test
build
```

Foundation aggregate target/script planned later:

```text
animation:v3:foundation
```

Equivalent semantic steps:

```text
workspace check
historical-sources lint/test/build
animation-contracts lint/test/build
animation-frame lint/test/build
animation-runtime lint/test/build
animation-scene lint/test/build
animation-fixtures lint/test/build
```

## 26. Local-first Phase 2 quality gate

Before push:

```text
L0 focused affected tests while editing
L1 each affected library lint/test/build
L2 cross-library compiler/fixture tests
L3 workspace check + full foundation lint/test/build
```

No GitHub push solely to learn whether TypeScript compiles.

After push/PR, GitHub Actions repeats deterministic foundation checks on Linux.

## 27. GitHub Actions Phase 2 expectations

CI should verify:

- frozen install;
- workspace graph;
- dependency audit policy;
- lint;
- unit tests;
- TypeScript builds;
- canonical scene/hash tests on Linux;
- V2 compatibility fixture;
- no browser/render job required unless Animation Lab already exists.

Cross-platform hash fixture is especially important: local Windows and GitHub Linux must produce the same expected canonical resolved hash.

## 28. PR sequence

Recommended coherent PRs:

### PR 2A — contracts

```text
animation-contracts
schemas/types
unit/lint/build
```

### PR 2B — frame kernel

```text
FrameContext
seed algorithm
easing/keyframes/events
negative wall-clock/random tests
```

### PR 2C — runtime registry

```text
adapter contract
capabilities
fake + failure adapters
```

### PR 2D — scene compiler

```text
resolution pipeline
canonical serialization
resolved hash
compiler report
```

### PR 2E — fixtures + V2 compatibility

```text
shared fixture library
Shot 3 read-only V2 adapter fixture
cross-library quality target
```

Each PR must be locally green before push and independently green in GitHub Actions.

## 29. Stop conditions

Stop Phase 2 and amend the contract if:

- canonical hashes differ Windows/Linux;
- runtime needs hidden wall-clock state;
- Scene V3 requires engine-specific fields in core contracts that cannot be namespaced;
- compiler silently drops unsupported data;
- V2 compatibility requires mutating canonical assets;
- source/evidence resolution becomes coupled to UI/network access at render time;
- fixtures cannot be shared across unit and future Storybook layers.

## 30. Phase 2 exit gate

Phase 2 is green only when:

- all five foundation libraries exist;
- every library lint/test/build is green locally;
- compiler produces stable `ResolvedSceneV3`;
- semantic seed contract is stable/versioned;
- fake runtime evaluates named proof frames deterministically;
- negative fixtures prove failure behavior;
- V2 Shot 3 compatibility fixture preserves timing/assets without modification;
- Windows local expected hashes match Linux CI expected hashes;
- GitHub Actions independently repeats deterministic foundation gates;
- no real animation-engine dependency was necessary.

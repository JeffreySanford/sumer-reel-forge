# Benchmark Fixture Data Contract

Status: **planning contract**

This document defines how benchmark scenes and proof states are represented so unit tests, Storybook, fixed-frame visual regression, motion proofs, semantic QA and human review all refer to the same fixture identity.

## 1. Benchmark fixture goals

A benchmark fixture must answer:

- what capability is under test;
- what manuscript requirement justifies it;
- which runtimes are allowed/expected;
- which source assets and historical bindings apply;
- what named proof states exist;
- what positive and negative criteria apply;
- which test layers consume it;
- what evidence proves completion.

## 2. Planned fixture shape

Conceptual:

```ts
interface AnimationBenchmarkFixture {
  fixtureVersion: number;
  id: string;
  title: string;
  capabilityIds: string[];

  story: StoryBinding;
  historicalSourceIds: string[];
  visualEvidenceIds: string[];

  scene: SceneV3;
  targetLevel: 2 | 3;

  proofStates: ProofState[];
  controls: BenchmarkControl[];
  negativeCases: BenchmarkNegativeCase[];

  requiredTests: BenchmarkTestRequirements;
  acceptance: BenchmarkAcceptanceContract;
  performanceBudget?: BenchmarkPerformanceBudget;
}
```

## 3. Fixture ID convention

```text
benchmark:enki-facial:v1
benchmark:enki-helm:v1
benchmark:stag-spatial:v1
benchmark:kutu-hail:v1
benchmark:igigi-canal:v1
benchmark:city-growth:v1
benchmark:enlil-council:v1
benchmark:sud-family:v1
benchmark:marriage-herd:v1
benchmark:long-journey:v1
```

Fixture revision changes when expected behavior/inputs materially change.

## 4. ProofState

```ts
interface ProofState {
  id: string;
  frame: number;
  semanticRole: string;
  expectedVisibleState: string;
  visualGolden?: string;
  requiredMetrics?: MetricExpectation[];
}
```

Examples:

### blink

```text
OPEN
CLOSING
CLOSED
OPENING
RETURNED_OPEN
```

### boat

```text
NEUTRAL
ROLL_LEFT
CENTER
ROLL_RIGHT
SETTLE
```

### city growth

```text
BARREN
EARLY_SETTLEMENT
ORGANIZED
EXPANDING
MATURE
```

## 5. Shared consumption

The same proof state object is used by:

```text
unit test expected frame
Storybook proof-state selector
Playwright exact-frame navigation
visual regression screenshot
motion-proof extraction
semantic-review prompt context
human review contact sheet
```

No duplicated hand-entered frame numbers per layer.

## 6. Controls

Benchmark controls isolate contributions.

Examples:

```text
BASELINE_L1
CHARACTER_FROZEN
MATERIAL_FROZEN
CAMERA_FROZEN
PHYSICS_FROZEN
CROWD_FROZEN
RUNTIME_DISABLED
```

A control is part of the fixture, not a secret debug script.

## 7. Negative cases

```ts
interface BenchmarkNegativeCase {
  id: string;
  mutation: FixtureMutation;
  expectedBlockingGate: string;
}
```

Examples:

### Enki face

- eyes stay open;
- cyan/debug eye patch;
- one eye closes only;
- wrong face/rig asset;
- no reopen.

### crowd

- identical clip/phase for all workers;
- all agents same position seed;
- count mismatch;
- path collision excess.

### spatial

- depth order reversed;
- camera reveals blank card edge;
- hidden geometry exposure.

### physics

- variable timestep;
- stale bake/runtime version;
- construction order mismatch.

## 8. Acceptance contract

```ts
interface BenchmarkAcceptanceContract {
  deterministic: AcceptanceGate[];
  visual: AcceptanceGate[];
  semantic: AcceptanceGate[];
  performance: AcceptanceGate[];
  human: HumanAcceptanceCriterion[];
}
```

Do not encode every artistic criterion as a brittle numeric threshold.

## 9. Required test layers

```ts
interface BenchmarkTestRequirements {
  unit: boolean;
  storybook: boolean;
  visualRegression: boolean;
  motionProof: boolean;
  semanticQa: boolean;
  e2e: boolean;
  humanReview: boolean;
}
```

A foundation-only fake fixture may not require human review. A hero motion benchmark does.

## 10. Performance budget

Example:

```text
preview target < 1s warm state change
short proof render < defined local budget
peak VRAM < benchmark allowance
100-worker fixture < crowd budget
```

Budgets live with capability fixture when meaningful.

## 11. Fixture source data

Fixtures should use deliberately small, stable assets when possible.

Two classes:

### synthetic fixture

For pure contract/runtime math.

### narrative fixture

Uses approved/manuscript-derived real source assets for fidelity/semantic benchmarks.

Synthetic tests cannot replace narrative benchmark proof.

## 12. Golden images

Goldens belong only to pinned browser/render environment.

Metadata:

```text
fixture ID/version
proof state ID
scene hash
browser/runtime environment
expected dimensions
```

Golden changes require explicit review and reason.

## 13. Motion proof definition

A motion proof declares:

```text
frame range
sample frames
expected action window
control render(s)
metrics
semantic question contract
```

This prevents arbitrary extraction scripts from becoming hidden truth.

## 14. Semantic QA prompt version

Fixture stores semantic contract ID, e.g.:

```text
semantic:blink-closed-v2
semantic:crowd-natural-variation-v1
semantic:boat-hail-response-v1
```

Prompt wording/model are evidence-bound outside the fixture or referenced by version.

## 15. Human review criteria

Examples for Enki face:

```text
blink unmistakable at normal speed
identity preserved
no eye patch/pop
both eyes coherent
reopen cleanly
breathing/gaze do not distract
```

Human checklist belongs to benchmark contract.

## 16. Storybook mapping

Each fixture automatically or conventionally maps to stories:

```text
Benchmarks/EnkiFacial/Overview
Benchmarks/EnkiFacial/Open
Benchmarks/EnkiFacial/Closed
Benchmarks/EnkiFacial/NormalSpeed
Benchmarks/EnkiFacial/Debug
```

## 17. E2E mapping

Fixture IDs should be selectable in Animation Lab/Studio test mode so E2E can load exact known states without production database uncertainty.

## 18. Fixture mutation tests

Negative fixtures should preferably derive from valid base fixture via deterministic mutation, e.g.:

```text
withAssetHashMismatch(base)
withOpenEyesAtClosedState(base)
withSynchronizedCrowd(base)
withVariableTimestep(base)
```

This reduces unrelated fixture drift.

## 19. Versioning

Bump fixture version when:

- source asset changes;
- scene timing/proof frames change;
- acceptance semantics change;
- benchmark target materially changes.

Do not bump for comments only.

## 20. CI usage

GitHub deterministic tests can consume fixture schema, unit expectations, Storybook browser states and receipt verification.

Heavy narrative benchmark rendering remains local/milestone unless CI capability changes.

## 21. Fixture review gate

A new production benchmark fixture is ready when:

- validates schema;
- has positive + negative cases;
- proof states are meaningful;
- Storybook mapping exists/planned;
- test-layer requirements explicit;
- source/provenance binding explicit;
- performance/human criteria explicit where needed.

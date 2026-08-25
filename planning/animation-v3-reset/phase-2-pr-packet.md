# Phase 2 PR Packet — Scene V3 Foundation

Status: **pre-written implementation packet / code not started**

This document turns the existing Phase 2 blueprint into five bounded implementation pull requests with expected files, stable tests, local commands, CI expectations, review questions and stop conditions.

The intent is that opening PR 2A should feel like executing a ticket, not reopening an architecture meeting.

## 1. Phase 2 global rules

All five PRs obey:

```text
no Rive
no Pixi
no Three/R3F
no Rapier
no Spine
no Theatre
no generative runtime dependency
```

Phase 2 proves the common deterministic contract first.

For every implementation-bearing PR:

```text
focused tests locally
→ affected lint locally
→ affected build/types locally
→ cross-library checks locally when applicable
→ workspace check locally
→ PUSH
→ GitHub independently repeats deterministic gates on Linux
```

Storybook/E2E are `N/A` for the pure foundation PRs unless Animation Lab/browser surfaces have already landed. `N/A` must be explicit, not silently skipped.

Current repository scripts that remain useful include:

```text
pnpm workspace:check
pnpm lint
pnpm test
pnpm build
pnpm quality
```

Phase 2 should prefer focused Nx project commands during edit loops and reserve repository-wide `pnpm quality` for the appropriate pre-push/milestone gate.

---

# PR 2A — Animation Contracts

## Objective

Create versioned, engine-independent Scene V3 public contracts and validation primitives.

## Expected project

```text
libs/animation-contracts/
  project.json
  src/index.ts
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
  src/lib/*.spec.ts
```

Exact generator scaffolding may differ, but public responsibilities may not drift into runtime/render code.

## Required decisions inside PR

- exact stable/branded ID strategy;
- `schemaVersion: '3'` representation;
- integer frame range contract;
- evidence/source reference types;
- transform value types without runtime ownership implementation;
- QA requirement references;
- validation result/error shape;
- treatment of optional arrays versus omitted fields;
- serialization-safe types only.

## Visual-evidence contract decision

Before merge, resolve the issue exposed by real Phase 1 records:

```text
one VisualEvidenceBinding scalar usage
       versus
canonical evidence record + project-specific applications
```

Preferred direction: canonical evidence identity plus separate applications so one Standard of Ur record can inform costume/social staging/ritual with different confidence without cloning object identity.

## Required stable tests

```text
CONTRACT-SCENE-001-valid-minimal
CONTRACT-SCENE-002-schema-version
CONTRACT-SCENE-003-frame-bounds
CONTRACT-SCENE-004-duplicate-id
CONTRACT-SCENE-005-missing-reference
CONTRACT-EVIDENCE-001-known-evidence-reference
CONTRACT-EVIDENCE-002-application-classification
FAILURE-EVIDENCE-004-publication-masquerades-as-object
```

Additional unit tests may exist, but these IDs become durable behavior expectations.

## Local commands

Planned focused commands after project creation:

```bash
pnpm exec nx test animation-contracts
pnpm exec nx eslint:lint animation-contracts
pnpm exec nx build animation-contracts
pnpm exec nx test historical-sources
pnpm exec nx build historical-sources
pnpm workspace:check
```

Before push, run the repository quality tier required by the quality manifest for an introduced foundation library.

## CI expectation

Linux repeats:

- install/frozen lockfile;
- workspace graph/check;
- `animation-contracts` lint/test/build;
- `historical-sources` lint/test/build or existing applicable checks;
- source scans for prohibited imports if introduced.

## Review questions

- Can contracts compile without React/Angular/Remotion/browser dependencies?
- Could a future Rive or Three adapter implement the types without modifying core Scene V3 fields?
- Are persisted frame coordinates integers?
- Can source/evidence relationships be represented without flattening confidence?
- Are invalid references rejected structurally before render?

## Stop conditions

Stop and amend architecture if core Scene V3 needs concrete engine object types or browser-only state.

---

# PR 2B — Frame Kernel

## Objective

Create the one canonical deterministic time/seed/keyframe evaluation kernel.

## Expected project

```text
libs/animation-frame/
  src/index.ts
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
    *.spec.ts
```

## Required API decisions

`FrameContext` is factory-created. Callers supply:

```text
frame
fps
durationFrames
sceneId
sceneSeed
mode
```

Factory computes:

```text
timeSeconds
progress
```

Do not allow contradictory persisted time values.

Semantic seed input remains semantic:

```text
sceneSeed
sceneId
targetId
channel
purpose
algorithmVersion
```

No index/order-based RNG streams.

## Required stable tests

```text
UNIT-FRAME-001-frame-to-time
UNIT-FRAME-002-progress-endpoints
CONTRACT-FRAME-001-integer-frame-authority
UNIT-SEED-001-repeatability
UNIT-SEED-002-channel-isolation
UNIT-SEED-003-field-order-canonicalization
UNIT-SEED-004-separator-safety
CONTRACT-SEED-001-version-explicit
FAILURE-FRAME-001-wall-clock-input
FAILURE-SEED-001-math-random-source
```

Also cover:

- 1-frame scene;
- first/last frame;
- invalid negative/out-of-range frame;
- `[startFrame,endFrame)` interval boundary;
- easing endpoints;
- proof-state resolution.

## Local commands

```bash
pnpm exec nx test animation-frame
pnpm exec nx eslint:lint animation-frame
pnpm exec nx build animation-frame
pnpm exec nx test animation-contracts
pnpm workspace:check
```

Add source-scan/lint enforcement for `Math.random`, `Date.now` and related wall-clock/randomness escape routes when practical.

## Cross-platform hash precursor

PR 2B does not yet hash resolved scenes, but it must establish UTF-8/canonical seed behavior whose expected outputs are pinned as fixtures. Those values will later be run on Windows locally and Linux CI.

## Review questions

- Can every animation state be evaluated from exact frame inputs?
- Does adding an unrelated semantic channel leave existing seeds unchanged?
- Is any wall-clock/browser global required?
- Are algorithms versioned so a future improvement cannot silently change old scenes?

---

# PR 2C — Runtime Registry + Fake/Failure Adapters

## Objective

Create runtime lifecycle/capability contracts and prove them without adopting a real animation engine.

## Expected project

```text
libs/animation-runtime/
  src/index.ts
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
    *.spec.ts
```

## Required fake-adapter capabilities

```text
deterministic 2D transform
deterministic opacity
parent/child transform input
semantic channel seed
named proof states
runtime evidence payload
```

The fake adapter should be good enough to become the first Animation Lab rendered adapter later.

## Failure-adapter modes

```text
prepare throws
evaluate throws at frame N
nondeterministic value
missing capability
asset checksum mismatch
evidence unavailable
dispose failure
```

## Required stable tests

```text
CONTRACT-RUNTIME-001-register-adapter
CONTRACT-RUNTIME-002-duplicate-registration-rejected
CONTRACT-RUNTIME-003-capability-preflight
UNIT-RUNTIME-001-fake-repeatable-evaluate
UNIT-RUNTIME-002-dispose-called
FAILURE-RUNTIME-001-prepare-error-diagnostic
FAILURE-RUNTIME-002-evaluate-frame-error
FAILURE-RUNTIME-003-nondeterministic-adapter
FAILURE-ASSET-001-hash-mismatch
```

## Local commands

```bash
pnpm exec nx test animation-runtime
pnpm exec nx eslint:lint animation-runtime
pnpm exec nx build animation-runtime
pnpm exec nx test animation-frame
pnpm exec nx test animation-contracts
pnpm workspace:check
```

## Review questions

- Can registry reject unsupported capability before rendering?
- Does adapter evaluation receive only deterministic frame context?
- Can an adapter mutate/promote canonical assets? It must not.
- Can an adapter silently substitute another asset? It must not.
- Are errors structured enough for future Studio diagnostics?

---

# PR 2D — Scene Compiler / Canonical Resolved Scene

## Objective

Compile authoring Scene V3 into a fully resolved, canonical, hashable scene before rendering.

## Expected project

```text
libs/animation-scene/
  src/index.ts
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
    *.spec.ts
```

`scene-v2-compat.ts` may begin here or be completed in 2E; broad migration does not belong here.

## Compiler stages are fixed

```text
1 parse/schema validation
2 semantic validation
3 historical source/evidence resolution
4 asset resolution
5 runtime/version resolution
6 capability validation
7 deterministic seed resolution
8 canonical ordering/serialization
9 resolved hash
```

A stage may report warnings but unsupported critical data must never disappear silently.

## Required stable tests

```text
CONTRACT-SCENE-010-compiler-stage-order
CONTRACT-SCENE-011-source-resolution
CONTRACT-SCENE-012-asset-resolution
CONTRACT-SCENE-013-runtime-version-binding
CONTRACT-SCENE-014-capability-resolution
CONTRACT-SCENE-015-canonical-order
CONTRACT-SCENE-016-resolved-hash-repeatable
CONTRACT-TRACE-001-scene-to-source
FAILURE-SCENE-001-missing-source
FAILURE-SCENE-002-missing-runtime
FAILURE-SCENE-003-unsupported-data-not-dropped
FAILURE-ASSET-001-hash-mismatch
```

## Canonical hash fixture

Create at least one fixed resolved-scene fixture whose expected canonical bytes/hash are pinned in source.

Local Windows and CI Linux must produce the same canonical scene hash.

Do not include:

- absolute workstation path;
- locale-dependent formatting;
- filesystem separator differences;
- object insertion-order accidents;
- runtime-generated timestamps.

## Local commands

```bash
pnpm exec nx test animation-scene
pnpm exec nx eslint:lint animation-scene
pnpm exec nx build animation-scene
pnpm exec nx test animation-runtime
pnpm exec nx test animation-frame
pnpm exec nx test animation-contracts
pnpm exec nx test historical-sources
pnpm workspace:check
```

## Review questions

- Is every discretionary resolution decision complete before render?
- Can a resolved scene explain exact source/evidence/runtime/asset inputs?
- Does canonical hash match expected fixture on Windows?
- Does compiler report distinguish warnings from blockers?
- Are runtime versions exact rather than broad semver intent?

## Stop condition

Cross-platform canonical hash mismatch blocks merge.

---

# PR 2E — Shared Fixtures + V2 Compatibility

## Objective

Create reusable positive/negative fixture identities and prove the current Shot 3 baseline can enter the V3 world without mutating production assets or inventing motion.

## Expected project

```text
libs/animation-fixtures/
  src/index.ts
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

Complete in `animation-scene`:

```text
scene-v2-compat.ts
```

## Primary migration fixture

Current Shot 3 baseline:

```text
editorial source:
blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png

approved Enki derived body hash:
3c7cdfdbde7776f91cf4b3f81908443b56194931a74654ecdbdb5798917aa6f5

approved closed-eye state hash:
b1d40abaaa8a8d29d368f5063eab35d172f6e70158e97b4facba7142d407d9e7
```

The compatibility fixture is read-only. It proves representation parity, not V3 visual superiority.

## Required stable tests

```text
MIGRATION-V2-001-shot03-duration
MIGRATION-V2-002-shot03-asset-hashes
MIGRATION-V2-003-shot03-layer-order
MIGRATION-SCENE-001-v3-schema-roundtrip
CONTRACT-FIXTURE-001-unique-fixture-id
CONTRACT-FIXTURE-002-proof-state-frame-valid
FAILURE-FIXTURE-001-negative-fixture-must-fail
FAILURE-V2COMPAT-001-unknown-feature-explicit
```

## Parity requirements

- duration unchanged;
- sourceStart unchanged where applicable;
- source/editorial identity unchanged;
- canonical asset hashes unchanged;
- depth/layer order equivalent;
- optional/deferred layers explicit;
- no new motion invented;
- historical evidence receipts remain linkable.

## Local commands

```bash
pnpm exec nx test animation-fixtures
pnpm exec nx eslint:lint animation-fixtures
pnpm exec nx build animation-fixtures
pnpm exec nx test animation-scene
pnpm exec nx test animation-runtime
pnpm exec nx test animation-frame
pnpm exec nx test animation-contracts
pnpm scene-v2:test
pnpm workspace:check
```

Milestone pre-push should run the full applicable foundation quality tier, potentially `pnpm quality` once Phase 2 projects are integrated into repository targets.

## CI expectations

GitHub repeats all deterministic foundation tests and the V2 compatibility fixture. No GPU-heavy render is required for Phase 2 exit.

## Review questions

- Can unit/Storybook/future E2E all import the same fixture identity?
- Does a deliberately bad fixture actually fail?
- Is Shot 3 compatibility read-only?
- Are existing asset hashes preserved?
- Can unsupported V2 behavior fail loudly instead of disappearing?

---

# 7. Phase 2 merge dependency graph

Preferred order:

```text
2A contracts
 ↓
2B frame
 ↓
2C runtime
 ↓
2D compiler
 ↓
2E fixtures + V2 compatibility
```

2B and some 2A follow-up work may overlap on separate branches only if the public contract dependency is pinned. Avoid parallel PR churn that repeatedly changes foundation APIs.

# 8. Phase 2 exit packet

Before declaring Phase 2 complete, collect:

```text
local Windows command/result receipt
GitHub Linux CI result
expected canonical hash fixture
actual Windows hash
actual Linux hash
V2 Shot 3 parity report
known warnings list
unimplemented blocking test IDs = zero
quarantined deterministic tests = zero unless explicitly architecture-approved
architecture deviations/ADRs
```

No render/human gate is required merely to prove the engine-independent foundation, but any UI/visual behavior added opportunistically during Phase 2 inherits its applicable Storybook/E2E/visual gates.

# 9. Explicitly deferred to Phase 3+

Do not smuggle these into 2A–2E:

```text
Rive adapter
Pixi adapter
Three adapter
Rapier adapter
GPU material implementation
character rig editor
physics authoring UI
CityKit renderer
crowd renderer
production reel migration
```

Phase 2 ends with a deterministic road wide enough for those systems to drive on. It does not build every vehicle.
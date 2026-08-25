# Benchmark Proof Receipt Schema

Status: **planning contract / machine-readable benchmark evidence**

Benchmark acceptance currently spans unit, contract, Storybook, visual, motion, semantic, E2E, performance and human evidence. This document defines the receipt that rolls those independent layers into one queryable benchmark result without pretending they are the same kind of test.

## 1. Core rule

A benchmark receipt is an **index of exact evidence**, not a substitute for that evidence.

```text
benchmark fixture
  ↓
resolved scene + exact inputs
  ↓
independent test/proof receipts
  ↓
BenchmarkProofReceipt
  ↓
KEEP / KEEP_WITH_CONSTRAINTS / DEFER / REJECT
```

## 2. Conceptual schema

```ts
interface BenchmarkProofReceipt {
  schemaVersion: '1';
  benchmarkId: string;
  benchmarkRevision: number;
  fixtureId: string;
  commitSha: string;
  resolvedSceneHash: string;
  environmentProfileId: string;
  runtimeBindings: RuntimeBindingReceiptRef[];
  evidence: BenchmarkEvidenceRef[];
  requiredCoverage: BenchmarkCoverageRequirement[];
  blockingFailures: string[];
  warnings: string[];
  decision: 'KEEP' | 'KEEP_WITH_CONSTRAINTS' | 'DEFER' | 'REJECT';
  constraints?: string[];
}
```

## 3. Evidence reference

Each evidence item records:

```text
test/proof ID
family
status
blocking flag
receipt/artifact hash
input resolved-scene hash
fixture revision
proof state/frame range where applicable
environment class
```

Families remain distinct:

```text
UNIT
CONTRACT
STORY
A11Y
VISUAL
MOTION
SEMANTIC
E2E
FAILURE
PERF
HUMAN
RECEIPT
```

## 4. Coverage requirements

Benchmark definition declares required evidence families/IDs.

Example Enki Facial:

```text
CONTRACT-RIVE-001-enki-channel-map
STORY-RIVE-003-enki-closed
VISUAL-ENKI-002-blink-closed
MOTION-ENKI-001-natural-blink
SEMANTIC-ENKI-001-blink-readable
FAILURE-ENKI-002-cyan-eye-debug-leak
PERF-RIVE-001-hero-preview
HUMAN-ENKI-001-facial-performance
```

Missing blocking evidence is visible as `NOT_IMPLEMENTED_BLOCKING`, not silently green.

## 5. Exact input binding

Benchmark receipt binds:

- benchmark/fixture revision;
- resolved scene hash;
- runtime adapter/package versions;
- asset hashes;
- physics bake hash if applicable;
- performance clip revisions;
- material/world/crowd revisions;
- source/evidence registry revisions when production-relevant.

If any hash-critical input changes, the benchmark receipt becomes stale.

## 6. Environment profiles

Evidence may come from different approved environments:

```text
CORE
BROWSER
RENDER
PHYSICS
AI_OPTIONAL
MILESTONE
```

Receipt records where each item ran. A local GPU motion proof cannot be misrepresented as a GitHub CI render.

## 7. Decision rules

### KEEP

All blocking required evidence current and passing; performance/security/license requirements satisfied; human gate approved where required.

### KEEP_WITH_CONSTRAINTS

Capability accepted with explicit operational constraints, for example:

```text
Rive hero rigs only, not 100-agent crowds
Three depth-card camera limited to approved crop range
Rapier authoring supported only on canonical bake workstation profile
```

Constraints are machine-readable text/IDs and become adoption policy.

### DEFER

Promising but one or more blocking requirements not yet met. No production capability claim.

### REJECT

Benchmark demonstrates the approach does not satisfy the intended capability or policy.

## 8. Negative tests

Negative fixtures prove the benchmark catches known bad output. Receipt distinguishes:

```text
negative fixture executed
expected failure observed = PASS
```

from

```text
negative fixture accidentally passed = BLOCKING FAILURE
```

## 9. Performance evidence

Performance receipt records:

```text
machine profile
runtime versions
fixture density/complexity
preview frame evaluation
render duration where measured
memory/GPU observations where available
budget verdict
```

Do not compare performance numbers from different machine profiles without labeling them.

## 10. Human evidence

Human review receipt binds exact render/proof hashes. It cannot be copied forward after scene/runtime bytes change.

## 11. Semantic QA

Semantic/model QA records model/version/prompt-contract/input hashes. It is never allowed to erase deterministic failure or replace human approval.

## 12. Benchmark examples

Required initial receipts:

```text
benchmark:enki-facial:v1
benchmark:enki-helm:v1
benchmark:stag-spatial:v1
benchmark:kutu-storm:v1
benchmark:igigi-crew:v1
benchmark:city-growth:v1
```

## 13. Staleness

Reasons include:

```text
FIXTURE_STALE
SCENE_STALE
ASSET_STALE
RUNTIME_STALE
CLIP_STALE
MATERIAL_STALE
PHYSICS_BAKE_STALE
WORLD_STALE
QA_CONTRACT_STALE
HUMAN_REVIEW_STALE
LICENSE_REVIEW_STALE
```

Do not collapse to generic stale.

## 14. Receipt validation

Required checks:

- unique benchmark/receipt IDs;
- all blocking coverage requirements represented;
- evidence hashes present;
- evidence refers to same fixture/resolved inputs where required;
- expected negative failures observed;
- decision legal for current failure state;
- `KEEP` impossible with unresolved blocking evidence;
- human evidence current for visual production benchmark.

## 15. Storybook/Studio

Benchmark dashboard should render:

```text
coverage family grid
current/stale evidence
blocking failures
runtime versions
proof states
performance summary
human review status
adoption decision/constraints
```

Each cell navigates to the underlying evidence instead of only showing a green check.

## 16. Stable tests

```text
CONTRACT-RECEIPT-001-valid-benchmark-proof
CONTRACT-RECEIPT-002-blocking-coverage-complete
CONTRACT-RECEIPT-003-input-hash-consistency
FAILURE-RECEIPT-001-keep-with-blocking-failure
FAILURE-RECEIPT-002-stale-human-review
FAILURE-RECEIPT-003-negative-control-unobserved
E2E-STUDIO-006-benchmark-evidence-drilldown
```

## 17. Definition of readiness

The benchmark receipt is ready when one machine-readable object can explain exactly why a capability is accepted/deferred/rejected, while every verdict remains traceable to independent test/proof/human evidence bound to exact inputs.
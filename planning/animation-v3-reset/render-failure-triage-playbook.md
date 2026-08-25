# Render Failure Triage Playbook

Status: **planning operating procedure / diagnostics and recovery**

Render problems should be classified and reproduced without changing inputs during diagnosis.

## 1. Failure classes

```text
PREFLIGHT
SCENE_COMPILE
ASSET_RESOLUTION
RUNTIME_PREPARE
RUNTIME_EVALUATE
PHYSICS_BAKE
FRAME_RENDER
ENCODE
OUTPUT_VALIDATION
DETERMINISTIC_QA
SEMANTIC_QA
HUMAN_REVIEW
PROMOTION
INFRASTRUCTURE
```

## 2. Preserve evidence first

Retain the commit SHA, scene revision/hash, resolved hash, render request, runtime versions, asset hashes, failing frame, logs, output hash/size and related stable test IDs.

Do not immediately regenerate assets or overwrite the candidate.

## 3. Triage order

```text
input identity
→ compiler/preflight
→ exact asset bytes
→ runtime version/capability
→ deterministic frame state
→ render/compositing
→ encode/output
→ independent QA
→ human review
```

This prevents debugging animation when the wrong asset was loaded.

## 4. Preflight problems

Missing asset, hash mismatch, unknown runtime, unsupported capability, stale physics bake or unresolved source/evidence should block before render.

Do not downgrade a production blocker merely to obtain an output file.

## 5. Scene compiler problems

Check duplicate IDs, invalid frame ranges, parent cycles, transform ownership conflicts, unknown clip/material/world references and canonicalization errors.

Unsupported data must be reported explicitly rather than dropped.

## 6. Runtime prepare problems

Record adapter/package version and resolved asset hashes. Classify whether the problem is unavailable package/feature, invalid runtime asset, unsupported environment or adapter defect.

Fallback is allowed only when the benchmark/scene contract explicitly declares one.

## 7. Runtime evaluation problems

Record exact frame and semantic channel state. Reproduction should require only resolved scene identity, frame, runtime evidence and deterministic mode.

A result that depends on prior evaluation order is a determinism defect.

## 8. Physics problems

Separate simulation-authoring, repeatability, bake-validation and bake-playback failures. Production render never switches to live simulation as an undocumented workaround.

## 9. Frame-render problems

Use shared controls such as:

```text
CHARACTER_FROZEN
MATERIAL_FROZEN
CAMERA_FROZEN
PHYSICS_FROZEN
DEBUG_BOUNDS
RUNTIME_DISABLED
```

Controls should preserve the same fixture/resolved input identity wherever practical.

## 10. Encode/output problems

A valid frame sequence with failed encoding is not automatically an animation-quality failure. Record codec/profile, encoder version, exit status, dimensions/fps/duration and whether a partial output exists.

## 11. Deterministic QA problems

For a failed gate such as debug leakage, missing blink, contact loss, wrong hash or synchronized crowd:

- retain the failing artifact;
- name the gate/test ID;
- compare intended proof state with runtime evidence;
- classify source vs scene vs adapter vs QA-contract ownership.

Do not weaken thresholds until the discrepancy is understood.

## 12. Semantic QA disagreement

Structural deterministic invariants remain authoritative for structural facts. Semantic/model QA remains evidence. Human review resolves perceptual ambiguity.

## 13. Human rejection

Human rejection is a valid production outcome even with green automation. Record the criterion, such as identity drift, puppet appearance, unreadable motion, excessive camera, contact quality, clutter or insufficient improvement.

A new candidate/revision addresses the issue; prior receipts remain immutable.

## 14. Promotion problems

Promotion blocks on candidate/staged hash mismatch, stale QA/human receipt, wrong scene cross-link, production-ineligible debug asset or invalid supersession history.

## 15. Infrastructure classification

Examples include unavailable CI service, unavailable local optional service, browser startup issue, insufficient disk or render-environment failure unrelated to scene logic.

Infrastructure failure yields `UNVERIFIED`, not a false software pass.

## 16. Reproduction bundle

Preferred bundle:

```text
failure.json
resolved-scene reference/hash
render-request.json
runtime-evidence.json
frame-state.json
selected-frame.png
logs.txt
machine-profile.json
related-receipts.json
```

## 17. Escaped defect policy

When an actual visual/production defect escaped the existing gates:

```text
assign durable FAILURE-* ID
create minimal negative fixture
prove current gate misses/fails appropriately
correct implementation or gate
retain regression fixture
```

## 18. Severity

```text
S0 provenance/promotion integrity risk
S1 production-blocking deterministic defect
S2 benchmark/render blocker
S3 visual-quality rejection
S4 non-blocking warning
INFRA verification unavailable
```

## 19. Stable IDs

```text
FAILURE-RENDER-001-empty-output
FAILURE-RENDER-002-frame-evaluation
FAILURE-RUNTIME-002-evaluate-frame-error
FAILURE-ASSET-001-hash-mismatch
FAILURE-PROMOTION-001-stale-approval
FAILURE-INFRA-001-ci-unavailable
```

## 20. Definition of successful triage

Triage succeeds when input identity is frozen, the owning subsystem is known or bounded, reproduction is deterministic enough to test, evidence remains intact, and the proposed correction does not silently change unrelated production inputs.
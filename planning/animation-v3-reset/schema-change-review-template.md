# Scene V3 Schema-Change Review Template

Status: **mandatory review template once Scene V3 implementation begins**

Use this template for any change that alters a persisted Scene V3 contract, resolved-scene contract, receipt contract, stable semantic ID meaning, canonical serialization behavior, or migration interpretation.

A TypeScript interface edit is not “just a type change” once scenes, fixtures, receipts and promoted renders depend on it.

---

# Schema Change Review — `<short title>`

## 1. Change identity

```text
change ID:
PR/branch:
author:
date:
affected schema/contract:
current version:
proposed version:
change class:
```

Change class:

```text
ADDITIVE_OPTIONAL
ADDITIVE_REQUIRED
SEMANTIC_CHANGE
RENAME
REMOVAL
TYPE_NARROWING
TYPE_WIDENING
SERIALIZATION_CHANGE
HASH_CHANGE
ID_SEMANTIC_CHANGE
MIGRATION_ONLY
RECEIPT_CHANGE
```

## 2. Why is this change necessary?

Describe the concrete benchmark, manuscript requirement, implementation evidence or escaped defect that requires the change.

Do not use:

```text
"cleaner"
"easier"
"library wants it"
"future proofing"
```

without a specific production consequence.

Evidence:

```text
benchmark ID(s):
test ID(s):
scene ID(s):
issue/defect:
runtime spike evidence:
```

## 3. Before / after contract

### Before

```ts
// exact relevant current shape
```

### After

```ts
// exact proposed shape
```

## 4. Persisted semantic meaning

Answer explicitly:

- Does an existing field change meaning?
- Does a default value change meaning?
- Does omitted versus empty change meaning?
- Does order become meaningful or stop being meaningful?
- Does a frame boundary interpretation change?
- Does a source/evidence confidence classification change?
- Does runtime ownership change?
- Does a stable ID now resolve to different semantics?

If yes to any, this is not a trivial additive change.

## 5. Canonical serialization impact

```text
canonical bytes changed? YES / NO
resolved hash changed? YES / NO
expected hash fixture changed? YES / NO
Windows/Linux parity risk? YES / NO
```

Explain why.

If a semantically equivalent scene would receive a new resolved hash solely because serialization changed, state whether that is intentional.

Never “fix” a hash fixture by updating the expected value before explaining the byte/semantic difference.

## 6. Authored Scene V3 impact

Inventory:

```text
current authoring fixtures affected:
current production scenes affected:
current examples/docs affected:
current Storybook states affected:
current E2E workflows affected:
```

For each existing scene:

```text
NO_CHANGE
AUTO_MIGRATABLE
MANUAL_MIGRATION
PIN_OLD_VERSION
INVALID_UNTIL_FIXED
```

## 7. Resolved-scene impact

Does resolution now:

- choose a new source/asset/runtime?
- create/delete deterministic seed bindings?
- change canonical order?
- add a required capability?
- change transform ownership?
- change path normalization?
- alter evidence included in receipts?

Any discretionary new resolution behavior requires an explicit test.

## 8. Source / evidence impact

```text
historical source bindings affected? YES / NO
visual evidence bindings affected? YES / NO
evidence application/confidence affected? YES / NO
manuscript trace affected? YES / NO
```

If a schema change can make an analogical source appear direct, block it until provenance behavior is specified and tested.

## 9. Asset/provenance impact

```text
asset IDs changed?
asset hashes changed?
canonical asset bytes changed?
existing promotion receipts stale?
existing human approvals stale?
existing semantic QA stale?
```

Schema migration must never rewrite canonical media bytes just to make a record fit.

## 10. Runtime impact

Complete for every adapter category:

| Runtime | Impact | Adapter change | Capability change | Re-proof required |
|---|---|---|---|---|
| fake | | | | |
| layered V2 compat | | | | |
| Rive | | | | |
| Pixi | | | | |
| Three | | | | |
| Rapier | | | | |
| other | | | | |

A schema change must not accidentally transfer transform/time authority between runtimes.

## 11. Fixture impact

List exact fixture IDs:

```text
positive fixtures:
negative fixtures:
benchmark fixtures:
V2 compatibility fixtures:
```

Required question:

> Can the existing fixture be migrated while preserving the behavior it was designed to prove?

If not, create a new fixture revision rather than silently changing history.

## 12. Test impact

Stable IDs added:

```text
...
```

Stable IDs modified:

```text
...
```

Stable IDs retired:

```text
...
```

For retired IDs, explain replacement/migration. Never delete an escaped-failure regression merely because the new architecture makes it inconvenient.

Minimum relevant families to consider:

```text
UNIT
CONTRACT
LINT
BUILD
STORY
A11Y
VISUAL
MOTION
SEMANTIC
E2E
PERF
FAILURE
HUMAN
RECEIPT
MIGRATION
```

## 13. Negative test required

Describe at least one failure case proving the old/invalid/ambiguous shape is rejected or migrated correctly.

```text
negative fixture ID:
expected failure code:
expected user-facing diagnostic:
```

If no negative case is applicable, explain why.

## 14. Migration plan

Migration mode:

```text
NONE
READ_COMPAT_ONLY
ONE_TIME_AUTOMATED
EXPLICIT_MANUAL
DUAL_VERSION_WINDOW
```

Migration steps:

```text
1.
2.
3.
```

Rollback:

```text
...
```

Never migrate by silently overwriting the only copy of an approved scene.

## 15. Receipt/staleness plan

Specify which staleness reasons apply:

```text
NARRATIVE_STALE
SOURCE_STALE
ASSET_STALE
SCENE_STALE
RUNTIME_STALE
PHYSICS_STALE
QA_STALE
HUMAN_APPROVAL_STALE
RECEIPT_SCHEMA_STALE
```

A schema version bump alone should not invalidate visual approval unless the resolved visual meaning actually changes; conversely, a semantic change must not remain approved just because pixels happen to look similar in one frame.

## 16. Backward compatibility

```text
can new reader read old scene?
can old reader read new scene?
can new compiler reproduce old resolved semantics?
can old promotion receipt still be verified?
```

State exact support window.

## 17. Local validation plan

Before push, list exact applicable commands.

Example foundation change:

```bash
pnpm exec nx test animation-contracts
pnpm exec nx build animation-contracts
pnpm exec nx test animation-scene
pnpm exec nx build animation-scene
pnpm exec nx test animation-fixtures
pnpm scene-v2:test
pnpm workspace:check
```

Add Storybook/E2E/render proof when behavior crosses those boundaries.

Result:

```text
LOCAL_GREEN / BLOCKED
```

## 18. GitHub CI validation

Expected jobs/gates:

```text
...
```

CI must independently verify deterministic checks; local success is necessary but not repository-complete.

## 19. Visual/human re-review decision

```text
visual proof required? YES / NO
motion proof required? YES / NO
semantic QA required? YES / NO
human review required? YES / NO
```

Reason:

```text
...
```

Do not force human re-review for a type-only change with identical resolved semantics. Do require it when visual/performance meaning changes.

## 20. Documentation updates

Check all that apply:

```text
[ ] scene-v3-contract-design.md
[ ] phase-2-implementation-blueprint.md
[ ] resolved-scene-and-receipt-examples.md
[ ] fixture candidates/examples
[ ] ADR
[ ] test taxonomy
[ ] migration strategy
[ ] Studio UI docs
[ ] runtime adapter docs
[ ] benchmark packet
[ ] README planning index/status
```

## 21. Approval checklist

```text
[ ] concrete need demonstrated
[ ] semantics before/after explicit
[ ] canonical hash impact understood
[ ] source/evidence impact reviewed
[ ] transform/time ownership unchanged or deliberately approved
[ ] migration/rollback defined
[ ] fixtures versioned appropriately
[ ] positive tests defined
[ ] negative test defined
[ ] local applicable gates green
[ ] CI applicable gates green
[ ] visual/human re-proof completed if required
[ ] docs updated
```

## 22. Final decision

```text
APPROVE
APPROVE_WITH_CONSTRAINTS
DEFER
REJECT
```

Decision rationale:

```text
...
```

---

# Why this template exists

Scene V3 is intended to outlive individual runtimes. The dangerous schema changes will often look harmless in a diff: rename a field, change an array default, make a runtime choose an asset, alter canonical ordering, add a “convenient” transform, or update a hash fixture.

This review forces the repository to ask the production question instead:

> Does the same manuscript/source/scene/revision still resolve to the same authored meaning, and can we prove what changed when it does not?

If that answer is explicit, schema evolution is safe. If it depends on remembering a chat or trusting a green TypeScript build, it is not.
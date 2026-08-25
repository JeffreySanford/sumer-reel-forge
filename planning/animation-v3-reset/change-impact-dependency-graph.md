# Change Impact and Dependency Graph Contract

Status: **planning contract / staleness and migration analysis**

Shared V3 assets and definitions can affect many scenes. Before changing a rig, clip, material, source record, city profile, runtime or bake, the repository should be able to explain the expected downstream impact.

## 1. Core graph

```text
manuscript/source/evidence
        ↓
character/prop/world definitions
        ↓
rigs / clips / materials / bakes
        ↓
Scene V3
        ↓
resolved scene
        ↓
proofs / QA / human review
        ↓
promotion
        ↓
reel assembly
        ↓
release
```

Dependencies are typed edges, not only free-text links.

## 2. Edge types

Initial vocabulary:

```text
BINDS_TO
DERIVED_FROM
USES
IMPLEMENTS
RESOLVES_TO
PROVES
REVIEWS
PROMOTES
ASSEMBLES
SUPERSEDES
CONTEXTUALIZES
```

## 3. Impact categories

```text
NO_PRODUCTION_IMPACT
DISPLAY_ONLY
PROVENANCE_REVIEW
RECOMPILE_REQUIRED
RERENDER_REQUIRED
QA_STALE
HUMAN_REVIEW_STALE
PROMOTION_STALE
RELEASE_REASSEMBLY_REQUIRED
MIGRATION_REQUIRED
```

One change may produce several categories for different dependents.

## 4. Example: Enki blink clip

```text
clip:enki:blink-natural:v1 → v2
```

Impact query should find:

- compatible rig mappings;
- Enki Facial benchmark;
- Enki Helm benchmark;
- scenes using v1;
- visual/motion/semantic proof receipts;
- human approvals;
- promoted scenes pinned to v1;
- releases containing those promoted scenes.

Existing released artifacts remain valid historical releases; they are not silently rewritten.

## 5. Example: source metadata typo

A source-title spelling correction may be `DISPLAY_ONLY` if source meaning/binding is unchanged.

Do not invalidate expensive visual proofs merely because metadata formatting changed.

## 6. Example: visual evidence reinterpretation

Changing an application from `DIRECT` to `ANALOGICAL` may require provenance/design review without changing current pixels automatically.

If a production design depended on a now-prohibited inference, affected assets/scenes become review-blocked.

## 7. Example: runtime version

Rive adapter/package version change affects only scenes/benchmarks resolving that runtime, not unrelated Pixi-only material proofs.

Required impact:

```text
runtime benchmark stale
resolved scene hash changes
render/QA/human evidence stale for affected scenes
```

## 8. Example: CityKit revision

Changing Eridu quay topology should identify:

- paths/regions affected;
- crowd definitions using them;
- scenes bound to those paths/regions;
- city-growth proof states;
- promoted/released scenes pinned to old city revision.

## 9. Impact report

Conceptual:

```ts
interface ChangeImpactReport {
  changeId: string;
  changedEntityId: string;
  oldRevision: string;
  newRevision: string;
  directDependents: ImpactNode[];
  transitiveDependents: ImpactNode[];
  stalenessActions: ImpactAction[];
  unaffectedEvidence: string[];
}
```

`unaffectedEvidence` is important: the system should avoid invalidating everything.

## 10. Dependency declaration

Dependencies should emerge from canonical contracts/receipts rather than a second manually maintained graph whenever possible.

Examples:

- Scene V3 references clip/material/world IDs;
- resolved scene references exact runtime/asset revisions;
- receipts reference resolved hashes;
- release manifest references promoted scene revisions.

A generated graph is safer than duplicated hand-maintained data.

## 11. Migration boundary

A change that cannot be represented without changing persisted schema triggers the schema-change review template in addition to ordinary dependency impact.

## 12. Query modes

Future tools/Studio should answer:

```text
what uses this?
what becomes stale if I change this?
why is this proof stale?
which releases still use the old revision?
what can remain current?
```

## 13. Negative cases

```text
FAILURE-IMPACT-001-missing-dependent-scene
FAILURE-IMPACT-002-global-stale-for-local-change
FAILURE-IMPACT-003-release-silently-repoints
FAILURE-IMPACT-004-cyclic-dependency
FAILURE-IMPACT-005-proof-stays-current-after-hash-critical-change
```

## 14. Tests

```text
CONTRACT-IMPACT-001-direct-dependency
CONTRACT-IMPACT-002-transitive-dependency
UNIT-IMPACT-001-staleness-classification
UNIT-IMPACT-002-unaffected-evidence-preserved
FAILURE-IMPACT-004-cycle-detected
E2E-STUDIO-011-change-impact-drilldown
```

## 15. Definition of readiness

The impact model is ready when shared-system revisions can be proposed with a deterministic list of affected scenes/proofs/releases, unaffected evidence is preserved, and no production artifact silently follows a newer dependency just because it exists.
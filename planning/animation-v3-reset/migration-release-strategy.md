# Animation V3 Migration and Release Strategy

Status: **planning contract**

This document defines how Sumer Reel Forge moves from the current Scene V2 / Reel 1 pipeline into the V3 platform without invalidating approved work or forcing a big-bang rewrite.

## 1. Migration principle

V3 is additive first, substitutive later.

The existing Reel 1 Level 1/Scene V2 baseline remains a valid historical production artifact.

No approved asset, timing decision or editorial source is overwritten merely because a new runtime exists.

## 2. Branch strategy

Recommended sequence:

```text
master
  │
  ├─ plan/animation-v3-reset
  │
  ├─ feat/historical-source-registry-v3
  │
  ├─ feat/animation-contracts-v3
  │
  ├─ feat/animation-lab-v3
  │
  ├─ spike/pixi-v3
  │
  ├─ spike/rive-v3
  │
  ├─ spike/three-v3
  │
  └─ spike/rapier-v3
```

Do not run every exploratory spike directly on master.

Package spikes are expected to be disposable if rejected.

## 3. Merge policy

Foundation branches may merge when:

- unit/build gates are green locally;
- code is architecture-neutral enough to support multiple runtimes;
- planning contract is satisfied;
- no production shot behavior changes unintentionally.

Runtime spikes merge only after keep/constrain decision.

## 4. Scene V2 freeze policy

Scene V2 remains supported during V3 development.

Permitted V2 work during reset:

- correctness fixes;
- security/dependency maintenance;
- canonical reproducibility fixes;
- evidence/QA fixes;
- urgent production bug fixes.

Avoid substantial new bespoke V2 animation features unless needed to preserve existing production.

## 5. Shot 3 diagnostic branch

The current blink work is retained as diagnostic research.

Its value includes:

- false semantic pass examples;
- bad localization examples;
- cyan/mask leakage examples;
- candidate-vs-render binding lessons;
- rendered proof architecture.

Do not silently merge experimental blink assets into canonical Reel 1 while V3 is being established.

Useful generic QA from that branch may later be extracted independently.

## 6. Scene V2 compatibility adapter

Before migrating any production shot, implement:

```text
Scene V2
   ↓
validate
   ↓
SceneV2CompatibilityAdapter
   ↓
Resolved Scene V3
```

The compatibility result must preserve:

- duration;
- fps;
- sourceStart;
- width/height;
- canonical asset hashes;
- captions/title behavior;
- baseline motion semantics.

A compatibility receipt proves equivalence.

## 7. Migration unit

Migration occurs **shot by shot**, not reel by reel.

A shot moves to a V3 runtime only when the new runtime provides a measurable benefit.

Examples:

```text
Shot 1
  may remain V2 longer

Shot 3
  early V3 candidate because hero rig + boat/materials matter

Shot 4
  early V3 candidate because underwater spatial/material system matters

Shot 6
  may intentionally remain restrained
```

## 8. Dual-render period

For a migrated shot, maintain:

```text
V2 baseline render
V3 candidate render
```

until human review accepts V3.

This enables A/B comparison and rollback.

## 9. Promotion policy

V3 promotion is explicit.

Required evidence:

- source hashes;
- scene hash;
- runtime versions;
- deterministic QA;
- semantic QA where applicable;
- normal-speed human review;
- comparison against current approved baseline.

Promotion changes the active production binding, not the historical baseline artifact.

## 10. Rollback

Every promoted V3 shot retains enough metadata to restore the prior approved binding.

Rollback does not require regenerating the old asset.

Store:

```text
previous scene version
previous asset manifest version
previous runtime binding
previous render receipt
```

## 11. Release channels

Define three internal channels:

### `lab`

Exploratory Storybook/spike work. No production assumptions.

### `candidate`

Resolved scene/runtime with deterministic proof. Human review pending.

### `production`

Human-approved and bound into canonical reel composition.

A runtime may be production-capable while a particular scene remains candidate-only.

## 12. Runtime maturity levels

```text
RESEARCH
SPIKE
LAB_CAPABLE
CANDIDATE_CAPABLE
PRODUCTION_CAPABLE
DEPRECATED
REJECTED
```

Runtime maturity is tracked independently from package version.

## 13. Asset maturity levels

```text
SOURCE
PREPARED
CANDIDATE
QA_PASSED
HUMAN_APPROVED
PRODUCTION
SUPERSEDED
REJECTED
```

Do not collapse runtime maturity and asset maturity into one flag.

## 14. Production source authority

`editorial-v1` or its explicit later editorial revision remains immutable once approved.

V3 may create:

- rigs;
- meshes;
- depth maps;
- geometry;
- textures;
- simulation bakes;
- performance clips.

All derived assets point back to their source revision.

## 15. Historical narrative revision

Historical fiction may evolve.

When narrative changes:

1. create manuscript revision identifier;
2. update narrative-source binding;
3. reclassify adaptation if needed;
4. mark affected scenes stale;
5. rerun source/provenance validation;
6. only rerender affected scenes after human intent review.

An ETCSL binding is not automatically invalid because dialogue changes; the adaptation classification may change instead.

## 16. Package upgrade release policy

Production runtime upgrades are treated like rendering-engine changes.

Required before upgrade merge:

- package compatibility tests;
- benchmark fixture tests;
- fixed-frame regressions;
- short motion proofs;
- runtime version receipt update.

For Remotion, all `@remotion/*` versions update atomically.

## 17. Schema upgrade policy

Scene schema upgrades must provide:

- explicit version;
- migration function;
- before/after fixture;
- migration unit tests;
- migration receipt for production scenes.

No hidden defaults may reinterpret old scenes silently.

## 18. CI policy during migration

GitHub Actions should remain light due to cost/availability constraints.

PR/push CI should prioritize:

- lint;
- types;
- unit tests;
- source registry tests;
- Storybook build/component tests where affordable;
- no expensive full MP4 suite by default.

Expensive proof renders remain local/manual until a later dedicated runner strategy exists.

## 19. Local milestone suite

Milestone command eventually runs:

```text
workspace checks
unit suites
Storybook browser tests
selected visual regressions
short benchmark motion proofs
semantic QA
Playwright workflow E2E
```

Full reel render runs only when necessary.

## 20. Reel 1 return criteria

Reel 1 active animation development resumes when:

- Scene V3 contracts stable;
- Animation Lab stable;
- hero facial performance benchmark passes;
- Pixi material proof passes;
- spatial R3F proof passes;
- one deterministic physics proof passes;
- source/provenance UI is usable enough to inspect scene bindings;
- rendered proof path binds actual runtime assets to final frames.

## 21. Reel 1 migration order

Recommended after platform gate:

1. Shot 3 — hero + boat/material benchmark;
2. Shot 4 — underwater/numinous benchmark;
3. Shot 8 — landfall/spatial contact;
4. Shot 5 — hospitality/performance;
5. Shot 7 — environment/world-state reveal;
6. Shot 2 — spatial coastline/vessel;
7. Shot 6 — restrained symbolic scene;
8. Shot 1 — quiet atmospheric opening.

The order may change after benchmark findings.

## 22. Chapter 2 production prerequisites

Before Chapter 2 animation production:

- Enlil hero rig;
- multi-actor blocking;
- council crowd reactions;
- procession path runtime;
- herd strategy;
- dialogue performance clips.

## 23. Chapter 3 production prerequisites

Before Chapter 3 animation production:

- CityKit;
- world-state transitions;
- worker crowd runtime;
- agriculture/work clips;
- construction/brickmaking systems;
- persistent water networks;
- montage/time-compression support.

## 24. Deprecation policy

Do not delete V2 support immediately after Reel 1 migration.

V2 may be deprecated only when:

- all canonical scenes have V3 equivalents or deliberate legacy status;
- compatibility renders are archived;
- old production receipts are retained;
- Studio no longer relies on V2-only editing paths.

## 25. Documentation release gate

Any production-capable runtime requires:

- architecture note;
- authoring guide;
- test guide;
- troubleshooting guide;
- evidence/provenance guide;
- known limitations.

## 26. Definition of Done

Migration strategy is complete when:

- V2 can coexist with V3;
- migration is shot-scoped and reversible;
- runtime/asset maturity are explicit;
- promotion/rollback are evidence-bound;
- package/schema upgrades are controlled;
- Reel 1 return criteria are explicit;
- Chapter 2/3 prerequisites are explicit;
- no big-bang rewrite is required.

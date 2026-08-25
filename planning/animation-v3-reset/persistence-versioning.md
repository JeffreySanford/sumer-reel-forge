# V3 Persistence, Versioning and Migration Plan

Status: **planning contract**

V3 introduces long-lived scene contracts, runtime-specific definitions, proof receipts, historical-source bindings and world states. These need deliberate persistence/version rules so animation improvements do not silently invalidate narrative provenance or old renders.

## 1. Version domains

Track these separately:

```text
manuscript revision
historical-source registry revision
Scene V3 schema version
scene revision
actor rig version
material definition version
world/city version
runtime adapter version
runtime package version
proof receipt schema version
canonical asset revision
```

Do not collapse them into one generic `version` field.

## 2. Scene identity

A Scene V3 scene has stable logical identity plus revision:

```ts
interface SceneIdentity {
  sceneId: string;
  sceneRevision: number;
  schemaVersion: string;
  manuscriptRevision: string;
}
```

Changing timing/performance/world state increments scene revision.

Changing only an unrelated external note does not.

## 3. Manuscript binding

A production scene binds explicitly to the narrative revision it adapted.

If manuscript text changes after scene approval:

```text
scene remains reproducible
scene becomes NARRATIVE_STALE if affected
editor reviews whether scene needs revision
source classification updated if relationship changed
```

Do not silently rewrite old scene provenance to point at a new manuscript revision.

## 4. Historical source registry versioning

ETCSL source records are logically stable by source key, but metadata corrections may change.

Keep:

- stable source ID;
- metadata revision;
- citation URL/title;
- adaptation bindings reference stable source ID.

A metadata correction should not automatically invalidate animation unless meaning/source relationship changed.

## 5. Scene V3 schema migrations

Schema migrations are explicit functions:

```ts
migrateV3_0ToV3_1(scene)
```

Rules:

- migration is deterministic;
- original input remains available in history/version control;
- migration never silently invents required semantic values;
- missing new required meaning results in migration warning/block requiring author choice.

Tests:

- known old fixture migrates to expected new fixture;
- migration idempotence where applicable;
- invalid legacy data blocked;
- timing/seed preservation.

## 6. Scene V2 compatibility

Scene V2 does not become Scene V3 by destructive rewrite.

Flow:

```text
V2 source
  ↓
V2CompatibilityAdapter
  ↓
Resolved V3-compatible runtime scene
```

Only an explicit migration creates a native V3 scene definition.

V2 canonical files remain valid historical baselines.

## 7. Actor rig versioning

Actor identity separates logical actor from rig implementation:

```text
actor: enki
rig: enki-rive-v1
rig revision: 3
```

A new rig does not replace old proof receipts.

Scenes may deliberately upgrade actor rig via migration/review.

Required upgrade checks:

- proof-state equivalence where intended;
- source identity;
- Storybook goldens;
- rendered A/B;
- human approval.

## 8. Performance clip versioning

Performance clips are reusable semantic assets:

```text
blink-natural/v1
formal-address/v1
dig-canal/v2
```

Changing a clip may affect many scenes.

Therefore clip promotion requires dependency impact analysis:

- scenes referencing clip;
- goldens/proofs affected;
- benchmark replay.

Avoid mutating widely used clips in place without revision.

## 9. Material versioning

Water/cloth/rigging material definitions similarly use stable IDs + revisions.

Scene receipts bind exact material revision/runtime version.

## 10. Physics bake versioning

A physics bake is immutable content-addressed output.

Identity includes:

- simulation definition hash;
- Rapier version;
- timestep;
- seed;
- construction hash;
- bake hash.

Changing any input produces a new bake.

## 11. CityKit versioning

Separate:

- city profile definition;
- development-state definition;
- procedural seed;
- scene-specific instance overrides.

A city profile revision may intentionally affect many scenes. Impact must be reviewable.

## 12. Proof receipt versioning

Receipt schema is versioned:

```ts
interface ProofReceipt {
  receiptSchemaVersion: '1';
  sceneIdentity: SceneIdentity;
  commitSha: string;
  runtimeVersions: ...;
  sourceHashes: ...;
  proofStates: ...;
}
```

Old receipts remain readable through migration/read compatibility.

Promotion may require current receipt schema or approved migrated receipt.

## 13. Staleness model

A proof can become stale for different reasons:

```text
CODE_STALE
SCENE_STALE
ASSET_STALE
RUNTIME_STALE
NARRATIVE_STALE
SOURCE_BINDING_STALE
RECEIPT_SCHEMA_STALE
```

Do not use one generic `stale=true` without reason.

## 14. Persistence in Studio/API

When Scene V3 editing enters Studio, save operations should use optimistic revision checks.

Conceptually:

```text
client loaded sceneRevision 12
client saves expectedRevision 12
server currently 12 => save 13
server currently 13 => conflict, do not overwrite
```

This prevents old browser state from silently clobbering newer authoring.

## 15. Audit fields

Every consequential mutation stores:

- who/what initiated;
- timestamp;
- previous revision;
- new revision;
- change category;
- optional reason/review ID.

For local single-user development, identity can still be system/user-local, but the data model should support auditability.

## 16. Candidate vs canonical persistence

Candidate output remains outside canonical data until explicit promotion.

Canonical references never point at ephemeral `tmp/` files.

Promotion copies/binds exact bytes into canonical location/storage and records hashes.

## 17. Derived data

Resolved scenes, diagnostic summaries and previews are derived data.

They may be cached, but canonical authority remains:

```text
manuscript/source records
scene definitions
canonical assets
runtime/version contracts
approved bakes
```

Derived data can always be discarded/rebuilt unless deliberately promoted as evidence.

## 18. Database migration policy

If Prisma schema is extended for V3:

- one conceptual feature per migration where practical;
- migration tested on fresh DB;
- migration tested on representative previous state;
- seed fixtures versioned;
- API DTO/schema tests updated;
- E2E persistence workflow updated.

Local before push:

```text
Prisma generate
migration deploy/test
unit
API E2E
Studio E2E
build
```

GitHub repeats database prepare + tests.

## 19. Backward compatibility window

During reset:

- V2 read/render support remains;
- V3 native scenes coexist;
- Studio indicates scene generation/version;
- migration is optional per shot until Reel 1 migration phase.

Do not establish a premature deadline to delete V2.

## 20. Version display in Studio

Review UI should make consequential versions visible without overwhelming normal users.

Inspector/debug panel can show:

```text
Scene V3.0 rev 12
Manuscript ch1-r4
Enki rig v1.3
Pixi material water-v2
Remotion 4.x
Proof receipt r1
```

This is essential when investigating visual differences.

## 21. Versioning tests

Unit:

- migration functions;
- stale reason classification;
- optimistic revision conflict;
- content-hash identity;
- dependency impact graph.

Storybook:

- current/stale/conflict provenance panels;
- migration warning UI;
- old-vs-new revision inspector.

E2E:

- load old scene;
- migrate/save;
- reload;
- conflict from stale revision rejected;
- old proof marked stale for correct reason;
- promoted canonical remains resolvable.

## 22. CI migration gate

CI should always test:

- clean database setup;
- current migrations apply;
- fixture schema migrations;
- old supported Scene V3 fixture can be read/migrated;
- V2 compatibility fixture still renders/contracts.

## 23. Deletion policy

Do not delete historical canonical revisions merely because a newer one exists.

Cleanup policy may delete:

- temp candidates;
- caches;
- generated previews;
- obsolete local model intermediates.

Canonical editorial sources, approved scene revisions, promotion receipts and important milestone evidence follow explicit retention rules.

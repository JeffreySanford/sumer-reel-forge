# Asset Taxonomy, Ownership and Lifecycle

Status: **planning contract**

This document defines how V3 classifies assets independent of physical folder layout. The taxonomy must remain understandable across Level 2 rigs, Level 3 spatial scenes, physics bakes, generative candidates, proof artifacts and historical evidence.

## 1. Why taxonomy matters

The Shot 3 blink failure demonstrated that a file path alone is not enough. We need to know:

- what kind of asset this is;
- whether it is source, candidate, derived, debug, proof or canonical;
- who is allowed to write it;
- which source it derives from;
- what runtime consumes it;
- whether it can be promoted;
- what checksum/evidence must travel with it.

## 2. Logical asset classes

```text
EDITORIAL_SOURCE
LITERARY_SOURCE_RECORD
VISUAL_EVIDENCE_RECORD
DERIVED_LOCALIZATION
DERIVED_SEGMENTATION
RIG_SOURCE
RUNTIME_ASSET
PERFORMANCE_CLIP
MATERIAL_ASSET
SPATIAL_ASSET
SIMULATION_DEFINITION
SIMULATION_BAKE
GENERATIVE_INPUT
GENERATIVE_CANDIDATE
PROOF_ARTIFACT
EVIDENCE_RECEIPT
CANONICAL_PRODUCTION_ASSET
SUPERSEDED_CANONICAL_ASSET
DEBUG_ARTIFACT
```

## 3. Editorial source

Examples:

- approved chapter illustration;
- approved base shot painting;
- approved source photograph/painting when legitimately owned/licensed.

Rules:

- immutable by default;
- content hash required;
- cannot be overwritten by a derivative process;
- all runtime preparation must point back to source hash;
- editorial revision produces a new source revision, not mutation in place without history.

## 4. Derived localization/segmentation

Examples:

- SAM eye mask;
- body alpha;
- depth mask;
- foreground segmentation;
- face box;
- object tracking map.

Rules:

- never publication output;
- never rendered directly unless explicitly debug mode;
- must carry source asset hash and algorithm/workflow version;
- safe to regenerate unless manually approved for deterministic reuse;
- should usually remain outside canonical production paths.

This class exists specifically to prevent another cyan/debug-mask leak.

## 5. Rig source

Prepared artwork intended for a character/animal rig:

```text
head region
body region
arm region
hair region
eye region
robe mesh source
```

Rules:

- derives from editorial source or approved reconstruction;
- carries transform/registration metadata;
- may be canonical rig input without itself being rendered as final scene content;
- identity/source-fidelity proof required for hero actors.

## 6. Runtime asset

Generic class consumed by a runtime:

```text
.riv file
Pixi mesh definition
Three geometry/depth card
Spine skeleton/atlas
shader/material definition
```

Required metadata:

- runtime type;
- runtime version compatibility;
- source inputs;
- content hash;
- logical asset ID;
- production maturity state.

## 7. Performance clip

A reusable semantic animation asset:

```text
blink-natural
breathe-calm
formal-address
turn-and-walk
dig-canal
row-boat
```

Clip identity includes:

- clip ID;
- version;
- intended actor/rig compatibility;
- duration or normalized phase;
- channels affected;
- contact/constraint assumptions;
- proof states;
- tests/evidence.

A performance clip is not an MP4. It is authored animation intent/state consumable by a runtime.

## 8. Material asset

Examples:

- water displacement texture;
- reed sway mesh;
- cloth mesh;
- rope geometry;
- fog material;
- particle sprite sheet;
- shader source.

Rules:

- bounded deformation contract;
- safe-zone/containment metadata where applicable;
- runtime ownership explicit;
- deterministic parameter inputs.

## 9. Spatial asset

Examples:

- depth card;
- terrain patch;
- architectural model;
- boat geometry;
- camera blocking geometry;
- occlusion proxy.

Rules:

- coordinate space declared;
- units declared;
- pivot/origin declared;
- source/evidence links where reconstruction is historical;
- hidden/unseen geometry cannot be invented silently from a 2D source.

## 10. Simulation definition

Human-readable deterministic definition of a physical system:

```text
bodies
colliders
joints
forces
initial conditions
timestep
seed
construction order
```

Not itself canonical animation output.

## 11. Simulation bake

Approved frame-indexed output from physics.

Required binding:

```text
simulation definition hash
engine + version
fixed timestep
seed
frame count
bake hash
```

Production Remotion should consume approved bakes rather than rerunning mutable simulation logic for canonical renders when reproducibility is critical.

## 12. Generative input

Examples:

- source crop;
- mask;
- control image;
- workflow JSON;
- prompt payload;
- seed.

Generative inputs are provenance, not canonical visual output.

## 13. Generative candidate

Any AI-produced candidate remains candidate until independent proof + human review.

Required metadata:

- source asset hashes;
- model/workflow version;
- prompt/parameter hash;
- seed;
- output hash;
- structural QA;
- semantic QA;
- human review state.

No `generated == approved` shortcut.

## 14. Proof artifact

Examples:

- contact sheet;
- exact-frame PNG;
- A/B MP4;
- crop montage;
- debug overlay render;
- semantic-review image.

Proof artifacts:

- are not canonical production assets;
- may be ephemeral locally;
- may be retained selectively at milestones;
- must name the exact asset/scene/runtime revision they prove.

## 15. Evidence receipt

Compact machine-readable durable record:

```ts
interface EvidenceReceipt {
  receiptVersion: number;
  commit: string;
  sceneId: string;
  sceneRevision: number;
  resolvedSceneHash: string;
  assetHashes: Record<string, string>;
  runtimeVersions: Record<string, string>;
  testResults: EvidenceTestSummary[];
  proofArtifacts?: ProofArtifactRef[];
  semanticReview?: SemanticReviewSummary;
  humanReview?: HumanReviewSummary;
}
```

Receipts should be small enough to commit even when heavyweight videos remain local.

## 16. Canonical production asset

An asset may be canonical only after explicit promotion.

Required:

- exact source/candidate bytes known;
- content hash stored;
- source provenance stored;
- runtime compatibility stored;
- QA gate passed;
- human approval when visual;
- promotion receipt.

Canonical status belongs to a logical asset revision, not merely a folder.

## 17. Superseded canonical asset

When replaced deliberately:

- old canonical record remains traceable;
- new record states `supersedes`;
- reason recorded;
- old evidence not deleted;
- scenes may remain pinned to old revision until migrated.

This prevents silent mutation of approved history.

## 18. Debug artifact

Examples:

- cyan mask visualization;
- alpha heatmap;
- coordinate boxes;
- runtime ID overlay;
- proof-state labels.

Hard rule:

**Debug artifacts must be impossible to enter production asset resolution without an explicit debug mode.**

Tests must include debug-leak negative fixtures.

## 19. Maturity state

Separate class from lifecycle state:

```text
EXPERIMENTAL
BENCHMARKED
PRODUCTION_READY
DEPRECATED
RETIRED
```

A `RUNTIME_ASSET` can be `EXPERIMENTAL`; a canonical asset should generally depend only on production-ready runtime paths unless an approved exception exists.

## 20. Lifecycle state

```text
DRAFT
CANDIDATE
QA_BLOCKED
QA_PASSED
HUMAN_REVIEW
APPROVED
PROMOTED
SUPERSEDED
REJECTED
```

Not every class uses every state.

## 21. Logical asset reference

Scene V3 should refer to:

```ts
interface AssetRef {
  id: AssetId;
  revision?: number;
  expectedHash?: string;
}
```

Resolution produces:

```ts
interface ResolvedAsset {
  id: AssetId;
  revision: number;
  kind: AssetKind;
  logicalPath: string;
  contentHash: string;
  sourceHashes: string[];
  maturity: AssetMaturity;
}
```

Absolute machine paths remain outside canonical Scene V3.

## 22. Physical path policy

Do not mass-reorganize existing Reel 1 assets just to satisfy V3 taxonomy.

First implement metadata/registry classification. Physical paths can migrate later.

Target path design should favor:

```text
assets/<story>/<chapter>/<reel>/...
evidence/...
```

while `tmp/` remains candidate/intermediate territory.

## 23. Git tracking policy

Track:

- canonical production assets of practical size;
- runtime definitions/rig files when license permits;
- scene definitions;
- compact proof receipts;
- source/evidence registries;
- deterministic fixtures.

Do not routinely track:

- temporary segmentation masks;
- generated candidate sweeps;
- intermediate crops;
- large benchmark MP4s;
- render caches;
- transient debug outputs.

## 24. Asset tests

Unit/contract tests:

- each asset kind validates required fields;
- debug artifact cannot resolve in production mode;
- candidate cannot resolve as canonical without promotion;
- superseded revision remains resolvable by explicit pin;
- expected hash mismatch blocks;
- runtime compatibility mismatch blocks;
- missing source hash blocks hero rig promotion.

Storybook:

- asset inspector stories for every major class/state;
- debug/candidate/canonical labels visibly distinct;
- keyboard-accessible evidence expansion.

E2E:

- inspect candidate;
- reject candidate;
- promote approved candidate;
- reload and verify exact canonical revision;
- attempt debug artifact promotion and verify block.

## 25. Asset observability

Every render trace should be able to print:

```text
logical asset ID
asset kind
revision
resolved logical path
staged/render path
content hash
source hashes
runtime owner
maturity
lifecycle state
```

## 26. Exit criterion

This taxonomy is implemented sufficiently when Scene V3 can resolve a fixture containing source, rig, material, spatial, candidate and proof references without confusing lifecycle or allowing debug/candidate leakage into canonical production.

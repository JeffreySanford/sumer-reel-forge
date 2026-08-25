# Repository Storage, Retention and Artifact Policy

Status: **planning contract**

V3 will create many large and short-lived artifacts. This document defines what belongs in Git, what belongs in `tmp/`, what deserves durable evidence, and how caches/proofs are cleaned without losing canonical history.

## 1. Storage classes

```text
SOURCE_DURABLE
CANONICAL_DURABLE
CONFIG_DURABLE
EVIDENCE_DURABLE
FIXTURE_DURABLE
CANDIDATE_EPHEMERAL
PROOF_EPHEMERAL
CACHE_REBUILDABLE
MODEL_EXTERNAL
LOCAL_DIAGNOSTIC
```

## 2. Track in Git by default

- Scene V3 authoring JSON/TS fixtures;
- historical source/evidence registry records;
- runtime adapter/configuration code;
- rig/runtime definitions of practical size when license permits;
- performance clip metadata;
- material/shader definitions;
- simulation definitions;
- compact approved simulation bakes when practical;
- canonical production visual assets of practical size;
- benchmark fixtures;
- visual golden images kept intentionally small;
- compact render/QA/human/promotion receipts;
- migration receipts;
- ADR/planning/documentation.

## 3. Do not track routinely

- generated candidate sweeps;
- segmentation/localization intermediates;
- large MP4 proof renders;
- temporary contact sheets unless selected milestone evidence;
- Remotion render caches;
- Storybook build output;
- browser caches;
- AI model weights;
- Ollama/ComfyUI caches;
- `node_modules`;
- transient logs;
- timestamp-only diagnostics.

## 4. `tmp/` contract

`tmp/` is allowed to contain:

```text
animation-assets/candidates
animation-assets/intermediates
animation-previews
proofs
render-cache
diagnostics
service-output
```

No canonical production manifest may require a timestamped `tmp/` path to resolve.

## 5. Canonical asset rule

Canonical assets live under stable logical repository/storage locations and have registry/manifest entries containing:

```text
asset ID
revision
kind
content hash
source hashes
runtime compatibility
promotion receipt
```

A file under `assets/` is not automatically canonical merely because of path.

## 6. Evidence retention tiers

### Tier E0 — transient

Delete freely after diagnosis:

- raw logs;
- temporary masks;
- individual extracted diagnostic frames;
- failed generation intermediates.

### Tier E1 — current working proof

Keep locally while capability/scene is active:

- latest A/B MP4;
- contact sheet;
- proof JSON;
- semantic crop sets.

### Tier E2 — milestone evidence

Durable compact artifacts:

- proof receipt;
- selected contact sheet or exact-frame PNGs;
- human review receipt;
- render hash/metadata;
- performance summary.

### Tier E3 — release evidence

For promoted/released reel:

- canonical scene/asset hashes;
- final render receipt;
- final output hash;
- source/provenance revision;
- promotion/release receipts;
- optionally selected small visual evidence.

Large final video storage strategy can remain external/release-specific while its hash remains durable.

## 7. Candidate retention

Rejected candidates are not automatically valuable forever.

Keep durable metadata for important escaped failures/regressions, while large candidate bytes can be discarded if a compact synthetic/selected fixture preserves the failure.

Example:

```text
cyan eye failure
  → keep negative fixture/contact evidence
  → do not keep every failed ComfyUI sweep indefinitely
```

## 8. Regression fixture promotion

An escaped production failure should produce a small durable fixture when possible.

Lifecycle:

```text
real failure artifact
  ↓
understand root cause
  ↓
construct minimal faithful regression fixture
  ↓
verify old code fails / fixed code passes
  ↓
keep fixture durable
  ↓
large diagnostic artifact may expire
```

## 9. Golden image policy

Golden images are code/test artifacts, not an archive of every frame.

Rules:

- one pinned environment;
- only named proof states;
- explicit reason for update;
- store fixture/version metadata;
- optimize image size without altering comparison semantics;
- do not use broad “update all snapshots” as normal maintenance.

## 10. Physics bakes

Bakes can grow large.

Policy options by size:

```text
small: Git tracked
medium: compressed tracked if practical
large: external/local artifact + durable hash/receipt; regeneration deterministic
```

A bake used canonically must be retrievable/reproducible according to release policy, not merely exist on one workstation.

## 11. Rig files

Rive/Spine/etc. files:

- track if license permits and size practical;
- hash exact bytes;
- preserve source-preparation lineage;
- do not store proprietary editor caches unnecessarily;
- record required editor/runtime compatibility.

## 12. AI models

Model weights are external environment dependencies, never Git assets.

Receipts record:

```text
model ID
version/checksum when known
workflow hash
seed
parameters
```

Canonical generated/baked output can remain reproducible/auditable without committing model weights.

## 13. Museum/source images

Do not automatically download and commit museum imagery.

Registry records store:

- source URL/object ID;
- institution;
- license/use status;
- notes;
- optional locally approved derivative reference only where legally appropriate.

Historical evidence metadata is distinct from redistribution rights.

## 14. Audio assets

Canonical narration/ambience/music assets require:

- logical ID/revision;
- content hash;
- provenance/license/generated workflow as applicable;
- timing binding.

Temporary TTS attempts remain candidates.

## 15. Database vs Git

Authoring UX may persist drafts in DB, but promoted canonical scene definitions/receipts should have durable export/version representation suitable for source control/reproduction.

Database state alone must not be the only copy of a promoted scene.

## 16. Cache keys

Every visual/runtime cache key includes applicable:

```text
source hash
asset revision/hash
scene/resolved hash
runtime version
adapter version
parameters
seed
render profile
```

A cache hit is never evidence that the input is still current unless key binding proves it.

## 17. Cleanup command design

Future cleanup must be scoped:

```text
pnpm clean:v3:candidates
pnpm clean:v3:proofs --older-than=30d
pnpm clean:v3:render-cache
pnpm clean:v3:diagnostics
```

Never a generic destructive cleanup that can traverse canonical asset roots.

Dry-run default is preferred for broad cleanup.

## 18. Disk budget observability

Future `doctor:v3` or storage report should summarize:

```text
tmp candidates
proof MP4s
render cache
browser cache
AI model footprint
physics bakes
canonical assets
```

Warn before disk exhaustion becomes render failure.

## 19. CI artifacts

CI uploads only useful bounded artifacts on failure/specific workflows:

- Playwright trace;
- failure screenshot/video;
- Storybook test report;
- compiler/receipt diagnostics.

Retention periods should be finite and quota-aware.

Do not upload entire local animation candidate directories to Actions.

## 20. Release artifacts

A reel release manifest should reference:

```text
final video hash
canonical scene/reel assembly hashes
narration/audio hashes
runtime/package versions
source registry revision
human/release approval
```

Distribution platform copy is not canonical identity.

## 21. Backup priorities

Highest priority:

1. manuscripts/source records;
2. canonical assets/rigs;
3. Scene V3 definitions;
4. promotion/evidence receipts;
5. unique authoring data/bakes;
6. regenerate-able proof artifacts;
7. caches/temp.

## 22. Sensitive data

Never retain in receipts/artifacts:

- tokens;
- credentials;
- private service headers;
- secrets from environment;
- unrelated user data.

Sanitize logs before durable evidence.

## 23. Path normalization

Canonical references use logical paths/IDs. Absolute Windows/Linux paths remain local diagnostics only.

A promotion receipt generated on Windows must remain meaningful on Linux without path rewriting.

## 24. Retention tests

- cleanup dry-run never includes canonical asset root;
- debug/candidate files cannot be promoted by location alone;
- receipt remains valid after temp directory deletion;
- cache deletion does not alter canonical output semantics;
- release manifest does not reference `tmp/`;
- source registry can exist without locally downloaded museum image;
- large proof absence is represented as unavailable artifact, not corrupt canonical scene.

## 25. E2E storage scenarios

- create/reject candidate then cleanup; canonical unchanged;
- promote candidate then cleanup tmp; canonical still resolves;
- open old promotion receipt after local proof MP4 removed; receipt remains intelligible;
- stale cache rebuild yields same resolved hash;
- insufficient disk produces environment failure, not partial promotion.

## 26. Definition of storage readiness

The storage model is ready when ephemeral experimentation can be aggressively cleaned without losing the ability to reconstruct what is canonical, why it was approved, which sources/runtimes produced it, or how to reproduce deterministic platform behavior.

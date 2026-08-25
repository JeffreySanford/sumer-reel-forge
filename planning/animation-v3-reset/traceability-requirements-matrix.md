# End-to-End Traceability Requirements Matrix

Status: **planning contract**

This document defines the traceability chain that connects manuscript narrative, ancient-literary provenance, visual evidence, authored Scene V3 data, assets, runtimes, rendered frames, QA and promotion.

The objective is not bureaucracy. It is to make failures diagnosable and historical-fiction choices explainable.

## 1. Traceability chain

Every promoted visual should be traceable conceptually as:

```text
MANUSCRIPT REVISION
      ↓
NARRATIVE THREAD / SCENE INTENT
      ↓
LITERARY SOURCE BINDINGS
      +
VISUAL EVIDENCE BINDINGS
      ↓
SCENE V3 REVISION
      ↓
RESOLVED SCENE HASH
      ↓
ASSET REVISIONS / HASHES
      ↓
RUNTIME VERSIONS
      ↓
FRAME / PERFORMANCE / SIMULATION STATE
      ↓
RENDERED PROOF
      ↓
QA RECEIPTS
      ↓
HUMAN REVIEW
      ↓
PROMOTION RECEIPT
      ↓
CANONICAL PRODUCTION REVISION
```

## 2. Narrative identity

Required identifiers:

```text
manuscript ID
manuscript version/revision
chapter ID
narrative thread ID
scene/shot story binding
```

A narrative rewrite may change adaptation classification without deleting previous source relationships.

## 3. Literary provenance identity

Required:

```text
source registry revision
source record ID
source type
composition/work identity
locator/line range where known
adaptation relationship
confidence
```

A source record hash/revision should be able to identify the exact metadata used during scene review.

## 4. Visual evidence identity

Required:

```text
visual evidence ID
institution/site
object/site identity
date range
relationship class
license/use status
usage note
```

A visual asset should not inherit "historical truth" merely because it references a museum object.

## 5. Scene identity

```text
SceneV3 schema version
scene ID
scene revision
authoring scene hash
resolved scene hash
```

Authoring and resolved hashes are distinct:

- authoring hash identifies what was authored;
- resolved hash includes resolved assets/runtime/source revisions relevant to render.

## 6. Asset identity

For every resolved production asset:

```text
logical asset ID
asset kind
asset revision
content hash
source hashes
maturity state
lifecycle state
runtime owner
```

Filename alone is never sufficient identity.

## 7. Runtime identity

For every runtime affecting visual output:

```text
runtime type
runtime package/version
adapter version
capability set
```

Examples:

```text
remotion
rive
pixi
three/r3f
rapier
spine
scene-v3 adapter/compiler
```

## 8. Frame identity

Rendered proof frame is identified by:

```text
scene ID/revision
resolved scene hash
frame integer
fps
semantic seed contract version
mode
```

For physics playback also include bake hash.

## 9. Performance identity

Hero performance requires:

```text
actor ID
rig ID/revision/hash
performance clip ID/version
channels affected
clip timing/frame range
semantic seed bindings if variation exists
```

This allows a later question such as:

> Which exact blink clip and Enki rig created frame 101?

## 10. Material identity

Material trace:

```text
material ID/revision
runtime
source texture/mesh hashes
parameter set/version
frame driver IDs
```

## 11. Simulation identity

```text
simulation definition ID/hash
Rapier/runtime version
fixed timestep
seed
construction hash
initial-state hash
bake hash
frame count
```

## 12. Crowd/herd identity

Need reproducible population generation:

```text
crowd/herd definition ID
seed
actor/rig pool revision
count
behavior/clip pool revision
region/path revision
LOD policy version
```

Individual agent IDs should be stable enough for diagnostics even when not persisted manually.

## 13. Render identity

Render receipt:

```text
commit
Remotion version
composition ID
resolved scene hash
render dimensions/fps
frame range
codec/profile
staged asset hashes
output hash
```

This answers whether the file reviewed was actually produced from the claimed scene/assets.

## 14. QA identity

Each QA receipt records:

```text
QA contract version
gate IDs
input hashes
metrics
verdict
proof artifact hashes/refs
```

Do not store only one boolean `pass`.

## 15. Semantic QA identity

When Qwen/other vision critic is used:

```text
model ID/version
prompt/question contract version
input image/proof hashes
structured response
confidence
interpreted verdict
```

Semantic QA cannot silently change because prompt text changed without versioning.

## 16. Human review identity

Human decision binds to:

```text
candidate/output hash
proof hashes
criteria results
decision
notes
```

If candidate bytes change, approval is stale.

## 17. Promotion identity

Promotion binds:

```text
candidate hash
old canonical revision/hash
new canonical revision/hash
QA receipt hash
human review receipt hash
scene/source/runtime revisions
supersedes relation
```

## 18. Trace IDs in diagnostics

Logs should prefer stable IDs:

```text
scene=scene:ch01:r01:s03
actor=actor:enki
asset=asset:enki:rig:v1
runtime=rive
frame=101
resolvedScene=sha256:...
```

This makes logs searchable and comparable.

## 19. Traceability requirements by subsystem

| Subsystem | Narrative | Source | Asset | Runtime | Frame | QA | Human | Promotion |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Historical source card | ✓ | ✓ | — | — | — | ✓ | — | — |
| Hero actor rig | ✓ | contextual | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pixi material | scene | optional | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Spatial world | ✓ | ✓ visual | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Physics bake | scene | optional | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Crowd/herd | ✓ | visual/context | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Generative candidate | ✓ | source refs | ✓ | model | frame/segment | ✓ | ✓ | ✓ |

## 20. Storybook traceability

Animation Lab story toolbar/panel should eventually expose:

```text
scene ID/revision
fixture ID
frame
seed
asset IDs/hashes shortened
runtime versions
source/evidence IDs
proof-state name
```

Story screenshot metadata should be traceable to fixture revision.

## 21. E2E traceability scenarios

### E2E-TRACE-001 scene to source

Open a scene and navigate to its literary/visual provenance.

### E2E-TRACE-002 scene to asset

Open actor/material asset inspector and verify revision/hash.

### E2E-TRACE-003 proof to scene

Open a proof receipt and navigate back to exact scene/revision/frame.

### E2E-TRACE-004 stale approval

Change candidate hash and prove prior human approval becomes stale.

### E2E-TRACE-005 superseded canonical

Inspect old canonical revision and navigate to replacement/supersedes receipt.

## 22. Unit/contract tests

- all promoted receipts contain required trace links;
- resolved scene references known source/asset/runtime IDs;
- duplicate semantic IDs rejected;
- missing source registry revision detected;
- candidate approval hash mismatch detected;
- semantic QA prompt/model version required;
- physics bake receipt references definition hash;
- supersedes chain cannot self-cycle;
- debug proof cannot masquerade as canonical asset.

## 23. Traceability coverage report

Future tooling may calculate:

```text
scene count
scenes with narrative bindings
scenes with resolved source records
visual assets with evidence/source lineage
runtime assets with source hashes
proofs bound to resolved scene
promotions with complete receipts
stale approvals
broken trace links
```

Again, fictional bridges are valid; coverage means *declared relationship*, not forced ancient citation.

## 24. Staleness propagation

Example propagation:

```text
editorial source changes
  → rig source stale
  → rig proof stale
  → scene resolved hash changes
  → render proof stale
  → human review stale
  → promotion readiness blocked
```

But:

```text
Studio CSS changes
  → no scene/render receipt staleness
```

Staleness propagation must be dependency-aware.

## 25. Traceability and privacy/credentials

Receipts/logs must not capture:

- tokens;
- passwords;
- private connector credentials;
- absolute secret-bearing URLs.

Machine paths may be local diagnostics but should not be canonical portable identity.

## 26. ETCSL narrative example

Conceptually:

```text
Chapter 1 narrative thread: Kutu storm
  ↓
adaptation relationship
  ↓
ancient literary binding / related source tradition
  ↓
Scene V3 shot
  ↓
Stag boat + Enki rig + storm effect + physics bake
  ↓
render proof frames
  ↓
human A/B
  ↓
promotion
```

The trace explains inspiration without claiming the fictional connective narration is an ancient quotation.

## 27. Chapter 3 city example

```text
Chapter 3: Uruk weaving/livestock identity
  ↓
ETCSL/world-order source binding where applicable
  + museum/contextual visual evidence
  ↓
CityKit profile revision
  ↓
world state + crowd/herd assets
  ↓
Scene V3
  ↓
render proof
```

## 28. Definition of complete traceability

For any promoted frame, a developer/reviewer should be able to answer without guessing:

1. Which manuscript revision and narrative thread is this?
2. Which ancient source(s), if any, inspired it?
3. Which visual evidence informed reconstruction?
4. Which Scene V3 revision resolved it?
5. Which exact assets and runtime versions rendered it?
6. Which exact frame/seed/bake produced the reviewed state?
7. Which QA evidence passed?
8. Which human review approved it?
9. Which promotion made it canonical?
10. What does it supersede, if anything?

If those answers require chat history, traceability is incomplete.

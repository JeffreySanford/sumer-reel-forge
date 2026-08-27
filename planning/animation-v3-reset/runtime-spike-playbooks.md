# Runtime Spike Playbooks

Status: **planning contract / automation-first revision**

Updated: **2026-08-26**

Every major runtime/backend enters Sumer Reel Forge through a bounded manuscript-derived benchmark. Character work additionally follows [`automation-first-character-performance.md`](./automation-first-character-performance.md).

## 1. Shared spike rules

Every spike must:

- pin exact code/runtime/model versions where applicable;
- document code, model-weight and editor/license implications;
- use a manuscript-derived benchmark;
- obey Scene V3/FrameContext timing;
- add unit + applicable Storybook/Lab/render proof;
- include negative/failure fixtures;
- record source/template/bake hashes;
- record **manual touch count and expected reuse**;
- produce KEEP / KEEP_WITH_CONSTRAINTS / DEFER / REJECT;
- update planning/adoption evidence.

A default production backend fails the workflow gate if each new shot/reel requires GUI authoring or hand repair.

## 2. Shared evidence package

```text
spike-summary.md/json
source + candidate hashes
package/model versions
license notes
manual-touch count
local quality results
proof states
render/motion receipt
performance metrics
failure notes
adoption verdict
```

## 3. Primary actor spike — automated Enki preparation/performance

### Benchmark

Enki source identity → automated actor prep → neutral/stillness → facial performance candidate.

### Questions

- Can the accepted Enki source be prepared without manual editor work?
- Can semantic face/head/torso/arm/hand regions and anchors be proposed headlessly?
- Can invalid/contaminated regions be rejected rather than manually repaired?
- Can reusable semantic clips remain backend-independent?
- Can an approved performance state be deterministic or baked/hash-addressable?
- Can the same actor-prep package be reused across multiple shots?

### Required states

```text
SOURCE_IDENTITY
PREP_COMPLETE
NEUTRAL
PERFORMANCE_CONTROL
PERFORMANCE_PEAK
RETURNED_NEUTRAL
```

### Tests

- source hash/dimensions;
- actor-prep schema;
- region/anchor confidence bounds;
- source RGB/alpha fidelity where source-preserving;
- backend evidence completeness;
- no wall-clock authority;
- same input/evidence resolves same approved state;
- no recurring manual-editor requirement.

### Adoption gate

KEEP only if the pipeline is reusable/headless and human-reviewed output preserves identity. A visually impressive but manually repaired result is not the default production solution.

## 4. Optional LivePortrait spike — baked Enki facial performance

Status: **candidate only; production license gate unresolved until auxiliary detection model is replaced/resolved**.

### Why test

LivePortrait exposes command-line inference and reusable motion-template workflows, making it potentially compatible with automated reel production.

### Questions

- Can one approved motion template produce readable blink/gaze/head performance from the accepted Enki source?
- Can output be baked and frame-mapped deterministically enough for Remotion consumption?
- Does identity remain stable across OPEN/CLOSED/RETURNED_OPEN?
- Can face performance remain local without moving camera/background/body root?
- Can all production dependencies/models be commercially licensed?

### Required evidence

```text
source SHA
LivePortrait code revision
model/weights IDs + hashes
commercial-license evidence
motion-template/driving-input SHA
config/workflow SHA
seed if relevant
baked output SHA
fps + frame mapping
identity QA
human normal-speed verdict
```

### License gate

Upstream code is MIT, but upstream licensing states bundled InsightFace detection models are restricted to non-commercial research use. Production adoption is blocked unless those components are replaced by commercially compatible detection/landmark models or rights are otherwise resolved.

### Negative tests

- identity drift;
- background/boat motion caused by face backend;
- source/candidate hash mismatch;
- no-return-to-neutral;
- model/license evidence missing;
- output depends on live model inference during production render.

## 5. Rive spike — deferred specialist

Status: **DEFERRED AS DEFAULT HERO PATH**.

Completed evidence:

- `libs/animation-rive` neutral contract;
- no-autoplay/no-autonomous-clock rules;
- byte-identical ENKI-RIG-0 source prep.

Reason for deferment: the next useful step requires manual `.riv` editor authoring, which conflicts with the many-reel automation goal.

Reopen only if a one-time reusable rig can be amortized across many scenes and clearly beats automated alternatives. Production after rig creation must be fully headless and Scene V3-controlled.

## 6. PixiJS spike — source-backed 2D/material

Questions remain:

- exact-frame render without autonomous ticker;
- bounded source-safe deformation;
- source hash/registration integrity;
- clear human visual improvement.

Shot 3 evidence shows that Pixi itself can be sound while a proposed source mask is invalid. Reject bad masks; do not lower source/decomposition gates.

## 7. Three/R3F spike — spatial proof

Benchmark: painted-depth-card boat/coast/water scene.

Questions:

- preserve painterly identity;
- exact-frame camera parity;
- avoid hidden geometry exposure;
- place approved actor-performance/Pixi outputs without transform ambiguity;
- retain Remotion frame authority.

## 8. Rapier spike — fixed-step/baked physics

Benchmark: short Kutu hail/boat response.

Required proof: same initial state/version/order/fixed timestep → repeatable bake hash; production consumes approved baked transforms.

## 9. Spine / animal rig spike

Deferred until native/data-driven animal preparation and instancing are benchmarked. Compare visual value, automation cost and license burden; do not assume Rive/Spine is necessary.

## 10. Theatre.js authoring spike

Optional only. Production cannot depend on unsaved editor state. Any visual authoring must export deterministic Scene V3 tracks and demonstrate enough authoring-value reuse to justify the GUI step.

## 11. Live2D optional spike

Trigger only if close dialogue portraits cannot meet quality through the automated actor pipeline. Compare against the accepted automated baseline, not against Rive by default. Include proprietary Core/license analysis and manual authoring cost.

## 12. Generative/I2V spike

Generative systems are baked candidate producers, not general runtime replacements.

Required bindings:

```text
source hashes
model/workflow versions
model licenses
prompt/config hash
seed
candidate output hash
independent QA
human review
```

## 13. Performance metrics

Record cold startup, warm generation/preview, proof render duration, RAM/VRAM, bundle/runtime size, cache behavior, failure recovery and **human authoring minutes per reusable actor/shot**.

For the default pipeline, recurring manual minutes per shot should trend toward review-only work.

## 14. Decision record

```text
Decision: KEEP | KEEP_WITH_CONSTRAINTS | DEFER | REJECT
Capability/backend/version
Determinism/bake strategy
Visual quality
Source fidelity
Manual touch count
Reuse potential
Testing cost
License/model-weight status
Performance
Known risks
Fallback
```

## 15. Success criterion

A backend earns production adoption only when it solves a real manuscript capability, fits Scene V3/provenance/testing rules, has acceptable licensing, and scales to many reels without turning failures into manual editor queues.

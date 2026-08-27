# Actor Performance Clip Contract

Status: **planning contract / reusable performance semantics / backend-neutral**

Updated: **2026-08-26**

Performance clips describe **what an actor does and when**. They are not runtime timelines, Rive state machines, ML prompts, driving videos or scene-local magic numbers.

## 1. Core rule

```text
Scene V3 performance track
        ↓
PerformanceClipDefinition
        ↓
semantic channels + authored curves/events
        ↓
ActorPerformanceBinding
        ↓
procedural adapter OR reusable rig OR baked performance candidate
        ↓
frame-deterministic/baked runtime state
```

The scene remains backend-independent.

## 2. Conceptual contract

```ts
interface PerformanceClipDefinition {
  id: string;
  revision: number;
  semanticAction: string;
  compatibleActorIds?: string[];
  requiredCapabilities: string[];
  durationFrames: number;
  fpsBasis: number;
  channels: PerformanceChannelTrack[];
  events: PerformanceEvent[];
  contacts?: ContactIntent[];
  proofStates: PerformanceProofState[];
  sourceIds: string[];
}

interface ActorPerformanceBinding {
  actorPrepId: string;
  backendId: string;
  backendVersion?: string;
  sourceSha256: string;
  templateOrBakeSha256?: string;
  modelOrWorkflowEvidenceIds?: string[];
  licenseEvidenceId?: string;
}
```

Stable clip examples:

```text
clip:enki:blink-natural:v1
clip:enki:breathe-calm:v1
clip:enki:helm-adjust:v1
clip:enlil:formal-address:v1
clip:worker:dig-canal:v1
```

## 3. Semantic channels

Use engine-neutral names:

```text
face.eye-left-open
face.eye-right-open
face.gaze-x
face.gaze-y
body.breath
body.head-turn
body.arm-right
body.hand-right
```

Do not persist:

```text
Rive bone/input names
LivePortrait landmark indices
model prompts as semantic truth
Pixi container IDs
Three object IDs
editor-only timeline IDs
```

Backend mapping translates semantic channels into implementation controls/evidence.

## 4. Time model

Persist clip time in integer clip-local frames. Scene tracks provide explicit start/end/clip offset/playback/loop/hold/blend rules.

No wall-clock playback or backend-owned autoplay is authoritative.

For a baked backend, the bake has an explicit frame/fps mapping and checksum. Scene evaluation selects the approved baked frame; it does not ask the model to improvise timing during render.

## 5. Backend classes

A clip may map to:

### deterministic-procedural

Exact-frame source-region transforms/deformation.

### reusable-rig

A reusable skeletal/vector/native rig, including an optional future Rive adapter, only when the rig has already passed source and authoring-cost gates.

### baked-template

A reusable approved motion template resolved into deterministic/baked output.

### baked-generative

A model-backed candidate generated before production render and bound by source/model/workflow/template/output hashes.

The backend class does not change clip semantics.

## 6. Blend policy

Initial semantic policies remain:

```text
exclusive
weighted
additive
masked
```

Conflict resolution must fail explicitly on ambiguous ownership.

A backend that cannot isolate required semantic regions cannot claim masked composition simply because pixels changed.

## 7. Event markers

Examples:

```text
BLINK_CLOSED
HAND_CONTACT_BEGIN
HAND_CONTACT_PEAK
HAND_CONTACT_END
STEP_LEFT_PLANT
GESTURE_APEX
SPEECH_EMPHASIS
```

Events are frame-addressed data, never arbitrary code.

## 8. Contact intent

```ts
{
  actorAnchorId: 'anchor:enki:hand-right',
  targetAnchorRole: 'tiller-grip',
  startFrame: 22,
  endFrameExclusive: 61,
  toleranceProfileId: 'contact:hero-hand-prop:v1'
}
```

Actor-prep supplies anchors; scene binding selects the prop target; the performance backend must preserve the contact within tolerance.

## 9. Proof states

Example blink:

```text
OPEN          0
CLOSING       3
CLOSED        5
OPENING       7
RETURNED_OPEN 10
```

The same proof IDs drive unit tests, Animation Lab/Storybook, rendered evidence, semantic QA and human review.

## 10. Bake/provenance evidence

For generated/template-backed performance, receipts include as applicable:

```text
actor source hash
actor-prep revision
backend code revision/version
model/weights IDs + hashes
model license evidence
motion-template/driving-input hash
workflow/config hash
seed
baked output hash
fps/frame mapping
```

Production resolves approved bytes/state. Regeneration is not a prerequisite for every render.

## 11. Negative cases

```text
FAILURE-PERF-001 unknown-semantic-channel
FAILURE-PERF-002 clip-frame-out-of-range
FAILURE-PERF-003 ambiguous-exclusive-blend
FAILURE-PERF-004 incompatible-actor-capability
FAILURE-PERF-005 contact-target-missing
FAILURE-PERF-006 runtime-autoplay-state
FAILURE-PERF-007 wall-clock-driven-clip
FAILURE-PERF-008 proof-state-out-of-range
FAILURE-PERF-009 stale-source-or-bake-hash
FAILURE-PERF-010 unresolved-model-license
FAILURE-PERF-011 manual-editor-required-for-replay
```

## 12. Dependency impact

```text
clip revision changed
  ↓
which ActorPrepDefinitions/backends declare compatibility?
which scenes reference it?
which benchmark fixtures reference it?
which visual/motion/human receipts become stale?
```

## 13. Promotion lifecycle

```text
DRAFT
→ FIXTURE_READY
→ BACKEND_MAPPED
→ MOTION_PROOF
→ HUMAN_APPROVED
→ PRODUCTION_CAPABLE
→ SUPERSEDED
```

For a model-backed clip, `BACKEND_MAPPED` also requires license/model evidence.

## 14. Enki blink semantic contract

Action: `blink-natural`.

Required channels:

```text
face.eye-left-open
face.eye-right-open
```

Invariants:

- both eyes visibly close unless deliberately authored otherwise;
- identity returns to approved open state;
- debug masks never reach output;
- timing is deterministic/bake-addressable;
- blink does not move camera or whole actor root;
- a technically changed pixel region is not enough: normal-speed human readability is required.

## 15. Worker clip policy

Worker/crowd clips can target archetype capabilities rather than named actor IDs, but use the same exact-frame/backend/provenance rules.

## 16. Audio linkage

Audio markers and performance events bind by explicit frames. No backend samples hidden audio time or invents timing authority.

## 17. Storybook / Animation Lab

Stories expose semantic clips and backend evidence, for example:

```text
Performance/Enki/BlinkNatural
Performance/Enki/BlinkNatural/BackendEvidence
Performance/Enki/HelmAdjust
Performance/Worker/Dig
```

Controls can switch approved backends for A/B without changing Scene V3 semantics.

## 18. Definition of readiness

The clip system is ready when a scene schedules reusable semantic performance without knowing backend-local controls, exact/baked states reproduce from evidence, revisions invalidate stale proofs, and a new reel can reuse the clip without repeating GUI authoring.

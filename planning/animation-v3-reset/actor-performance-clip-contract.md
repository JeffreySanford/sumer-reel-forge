# Actor Performance Clip Contract

Status: **planning contract / reusable performance semantics**

Performance clips are reusable semantic animation assets. They are not runtime timelines, scene-local magic numbers, or opaque blobs whose meaning exists only inside Rive/Spine/Theatre.

## 1. Core rule

A scene says **what performance happens and when**. A rig adapter says **how that performance maps to runtime controls**.

```text
Scene V3 performance track
        ↓
PerformanceClipDefinition
        ↓
semantic channels + authored curves/events
        ↓
rig/runtime adapter mapping
        ↓
frame-deterministic runtime state
```

## 2. Identity and revision

Conceptual contract:

```ts
interface PerformanceClipDefinition {
  id: string;
  revision: number;
  semanticAction: string;
  compatibleActorIds?: string[];
  compatibleRigCapability: string[];
  durationFrames: number;
  fpsBasis: number;
  channels: PerformanceChannelTrack[];
  events: PerformanceEvent[];
  contacts?: ContactIntent[];
  proofStates: PerformanceProofState[];
  sourceIds: string[];
  notes?: string;
}
```

Stable clip identity examples:

```text
clip:enki:blink-natural:v1
clip:enki:breathe-calm:v1
clip:enki:helm-adjust:v1
clip:enlil:formal-address:v1
clip:worker:dig-canal:v1
```

A materially changed clip becomes a new revision/version. Do not mutate a widely reused clip in place.

## 3. Semantic channel tracks

Clip channels use semantic names:

```text
face.eye-left-open
face.eye-right-open
face.gaze-x
body.breath
body.head-turn
body.arm-right
body.hand-right
```

Runtime-local names such as `State Machine 1/Input 4` or a Rive bone name never appear in Scene V3 authoring data.

Each track declares:

- semantic channel ID;
- interpolation/easing ID;
- frame/value keyframes;
- blend policy;
- optional bounds;
- whether additive, weighted or exclusive.

## 4. Time model

Persist clip time in integer clip-local frames.

A scene performance track maps scene frames to clip frames through explicit rules:

```text
startFrame
endFrameExclusive
clipStartFrame
playbackRate rational/approved form if required
loopMode
holdMode
blendInFrames
blendOutFrames
```

No wall-clock playback and no runtime-owned autoplay.

## 5. FPS handling

Preferred rule for the first implementation: performance clips are authored against the project canonical 30 fps basis.

If arbitrary clip FPS is later required, conversion must be deterministic and versioned. Do not allow each runtime to resample differently.

## 6. Blend policy

Initial policies:

```text
exclusive
weighted
additive
masked
```

Examples:

- blink: weighted facial channel override;
- breath: additive torso deformation;
- formal-address gesture: exclusive arm/body gesture over an idle body layer;
- gaze: masked to eye/head channels.

Conflict resolution is explicit. Scene/runtime evaluation must fail on ambiguous exclusive ownership instead of choosing the last array element accidentally.

## 7. Event markers

Events are semantic, frame-addressed markers:

```text
BLINK_CLOSED
HAND_CONTACT_BEGIN
HAND_CONTACT_PEAK
HAND_CONTACT_END
STEP_LEFT_PLANT
GESTURE_APEX
SPEECH_EMPHASIS
```

Events do not execute arbitrary code. They support synchronization, QA, Storybook proof states, audio markers and contact checks.

## 8. Contact intent

Performance can declare expected semantic contact:

```ts
{
  actorAnchorId: 'anchor:enki:hand-right',
  targetAnchorRole: 'tiller-grip',
  startFrame: 22,
  endFrameExclusive: 61,
  toleranceProfileId: 'contact:hero-hand-prop:v1'
}
```

The clip expresses intent; scene binding selects the actual prop anchor.

## 9. Proof states

Every production clip defines a small set of meaningful proof frames.

Example blink:

```text
OPEN               0
CLOSING             3
CLOSED              5
OPENING             7
RETURNED_OPEN       10
```

Proof states are fixture data shared by unit, Storybook, rendered proof and QA.

## 10. Negative cases

Required failures include:

```text
FAILURE-PERF-001 unknown-semantic-channel
FAILURE-PERF-002 clip-frame-out-of-range
FAILURE-PERF-003 ambiguous-exclusive-blend
FAILURE-PERF-004 incompatible-rig-capability
FAILURE-PERF-005 contact-target-missing
FAILURE-PERF-006 runtime-autoplay-state
FAILURE-PERF-007 wall-clock-driven-clip
FAILURE-PERF-008 proof-state-out-of-range
```

## 11. Dependency impact

Changing a performance clip must produce an impact report:

```text
clip revision changed
  ↓
which rigs declare compatibility?
which scenes reference it?
which benchmark fixtures reference it?
which visual/motion/human receipts become stale?
```

A clip is shared infrastructure, not a private scene detail.

## 12. Clip promotion lifecycle

```text
DRAFT
  ↓
FIXTURE_READY
  ↓
RUNTIME_MAPPED
  ↓
MOTION_PROOF
  ↓
HUMAN_APPROVED
  ↓
PRODUCTION_CAPABLE
  ↓
SUPERSEDED
```

Production scene resolution may only use an allowed maturity state.

## 13. Enki blink v1 worked contract

Semantic action:

```text
blink-natural
```

Required channels:

```text
face.eye-left-open
face.eye-right-open
```

Required proof states:

```text
OPEN
CLOSING
CLOSED
OPENING
RETURNED_OPEN
```

Required invariants:

- both eyes reach closed state unless deliberately authored otherwise;
- identity returns to approved open state;
- no debug mask is part of the clip;
- timing is deterministic;
- blink does not move camera or whole actor root.

## 14. Worker clip policy

Crowd/work clips may be more generic:

```text
clip:worker:dig:v1
clip:worker:carry-silt:v1
clip:worker:rest:v1
clip:worker:tool-adjust:v1
```

Archetype compatibility replaces named-hero compatibility, but the same frame/seed/channel rules apply.

## 15. Audio/dialogue linkage

A speech/body clip can reference authored speech markers but does not own audio bytes.

Audio/caption architecture remains separate:

```text
audio marker
   ↕ explicit frame binding
performance event
```

No hidden audio-time sampling inside a rig runtime.

## 16. Storybook contract

Stories should expose:

```text
Performance/Enki/BlinkNatural
Performance/Enki/BreatheCalm
Performance/Enki/HelmAdjust
Performance/Enlil/FormalAddress
Performance/Worker/Dig
```

Each story consumes the same clip fixture the renderer will use.

## 17. Test IDs

Planned:

```text
CONTRACT-PERF-001-valid-clip
CONTRACT-PERF-002-semantic-channel-map
CONTRACT-PERF-003-blend-ownership
UNIT-PERF-001-proof-state-resolution
UNIT-PERF-002-event-frame-resolution
MOTION-ENKI-001-natural-blink
FAILURE-PERF-003-ambiguous-exclusive-blend
MIGRATION-PERF-001-revision-impact
```

## 18. Definition of readiness

The clip system is ready when a scene can schedule a reusable performance without knowing runtime bone/input names, the same exact clip state can be inspected in Storybook and Remotion, revisions produce deterministic staleness, and invalid channel/blend/contact configurations fail before render.